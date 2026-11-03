import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, onSnapshot, runTransaction, updateDoc, doc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const app = getApps().find(a => a.name === '[DEFAULT]') || initializeApp({apiKey:'AIzaSyAI8QZjC3qSNq33bNBk7Ls19bjanc4-QnQ',authDomain:'appunti-unisa.firebaseapp.com',projectId:'appunti-unisa',storageBucket:'appunti-unisa.firebasestorage.app',messagingSenderId:'682409351930',appId:'1:682409351930:web:728a3ba5a1d23ffe0a0743'});
const auth=getAuth(app), db=getFirestore(app), $=s=>document.querySelector(s);
const statuses={new:'Nuova',in_progress:'In elaborazione',rejected:'Rifiutata',resolved:'Risolta'};
const drafts=new Map();
const romeDay = date => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit'}).format(date);
const reportDateFormat=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function reportDateElement(timestamp){
  const date=timestamp?.toDate?.();
  if(!(date instanceof Date) || Number.isNaN(date.getTime()))return null;
  const parts=Object.fromEntries(reportDateFormat.formatToParts(date).map(part=>[part.type,part.value]));
  const time=document.createElement('time');
  time.className='report-date';
  time.dateTime=date.toISOString();
  time.textContent=`Inviata: ${parts.day}-${parts.month}-${parts.year}, ${parts.hour}:${parts.minute}`;
  return time;
}
let admin=false;
/* Conversazioni: reports/<id>/messaggi. Un ascolto per segnalazione, tenuto finché la segnalazione è in elenco. */
const threads=new Map(); // id -> {docs, unsub, seen:Set, first:boolean}
function stopThreads(){threads.forEach(t=>t.unsub&&t.unsub());threads.clear();}
const MAX_REPLY_USER=550, MAX_REPLY_ADMIN=1500;
const isAdmin=()=>admin;
let user=null, readyUser=null, unsubscribe=null, sending=false, authVersion=0, latestDocs=[], renderReports=()=>{};
for(const id of ['report-search','report-filter','report-sort']) document.getElementById(id).addEventListener('input',()=>renderReports());
const msg=(s,kind='')=>{const m=$('#message'); m.textContent=s; m.dataset.state=kind;};
const authMsg=(s)=>$('#auth-message').textContent=s;
auth.languageCode='it';
getRedirectResult(auth).catch(e=>authMsg(e.code==='auth/unauthorized-domain' ? 'Questo indirizzo non è autorizzato per l’accesso Google.' : 'Accesso Google non riuscito. Riprova.'));
/* "Cambia account": usa la stessa funzione del menu dell'account (assets/site.js), che salva prima le spunte */
if($('#switch-account'))$('#switch-account').onclick=async()=>{
  const b=$('#switch-account'); authMsg('');
  if(window.UA && window.UA.switchAccount){ await window.UA.switchAccount(b,null); return; }
  b.disabled=true;
  try { const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'}); await signInWithPopup(auth,provider); }
  catch(e) { if(!/popup-closed|cancelled/.test(e?.code||'')) authMsg('Cambio account non riuscito. Riprova.'); }
  finally { b.disabled=false; }
};
$('#login').onclick=async()=>{
  const button=$('#login'); button.disabled=true; authMsg('Apertura di Google…');
  try { const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'}); await signInWithPopup(auth,provider); authMsg(''); }
  catch(e) {
    const code=e?.code || '';
    authMsg(code==='auth/unauthorized-domain' ? 'Questo indirizzo non è autorizzato per l’accesso Google.'
      : code==='auth/popup-closed-by-user' ? 'Accesso annullato. Riprova.'
      : code==='auth/popup-blocked' ? 'Il browser ha bloccato la finestra di Google. Consenti le finestre popup per questo sito e riprova.'
      : 'Accesso non riuscito. Verifica la connessione e riprova.');
  } finally { button.disabled=false; }
};
const MAX_TEXT=550;
function paintCounter(){const t=$('#form').elements.text, n=t.value.length, c=$('#counter'), bar=$('#counter-bar');
  c.textContent=`${n} / ${MAX_TEXT}`; const st=n>=MAX_TEXT?'full':n>=MAX_TEXT*0.9?'near':'';
  c.dataset.state=st; if(bar){bar.style.width=Math.min(100,100*n/MAX_TEXT)+'%';bar.dataset.state=st;}}
$('#form').elements.text.addEventListener('input',paintCounter); paintCounter();

/* Limite: 5 segnalazioni, poi 12 ore di attesa dall'ultima (come nelle regole); barra delle segnalazioni usate e conto alla rovescia */
const QUOTA_MAX=5;
let quotaUnsub=null, quotaData=null, quotaFull=false;
const pad=n=>String(n).padStart(2,'0');
const QUOTA_WINDOW=12*36e5; // 12 ore dall'ultima segnalazione, come nelle regole (firestore.rules)
function quotaUntil(){const t=quotaData?.updatedAt?.toDate?.(); return t ? t.getTime()+QUOTA_WINDOW : 0;}
function usedToday(){return Date.now()<quotaUntil() ? Math.max(0,Math.min(QUOTA_MAX,quotaData.count|0)) : 0;}
/* "oggi alle 18:30", "domani alle 11:09" oppure "lunedì 3 novembre alle 9:00" (ora del dispositivo) */
function resetLabel(ms){
  const d=new Date(ms), now=new Date(), day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=Math.round((day(d)-day(now))/864e5);
  const time=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  const when=diff===0?'oggi':diff===1?'domani':d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  return `${when} alle ${time}`;
}
function canSend(){return !!user && readyUser===user && !sending && !quotaFull;}
function paintQuota(){
  const box=$('#quota'); if(!box)return;
  if(!user || readyUser!==user){box.hidden=true; quotaFull=false; return;}
  const used=usedToday(), left=QUOTA_MAX-used;
  quotaFull=left<=0; box.hidden=false; box.dataset.state=quotaFull?'full':left<=1?'low':'';
  $('#quota-num').textContent=`${used} / ${QUOTA_MAX}`;
  [...$('#quota-bar').children].forEach((i,k)=>i.classList.toggle('on',k<used));
  $('#quota-bar').setAttribute('aria-label',`${used} segnalazioni usate su ${QUOTA_MAX}`);
  if(quotaFull){
    const s=Math.max(0,Math.round((quotaUntil()-Date.now())/1000));
    $('#quota-msg').innerHTML='';
    const strong=document.createElement('b'); strong.className='quota-cd'; strong.textContent=`${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`;
    const at=document.createElement('b'); at.className='quota-at'; at.textContent=resetLabel(quotaUntil());
    $('#quota-msg').append('Hai usato tutte e 5 le segnalazioni. Potrai inviarne altre 5 ',at,', tra ',strong,'.');
  } else $('#quota-msg').textContent=(left===1?'Ti resta 1 segnalazione.':`Te ne restano ${left}.`)+(used?' Finite tutte e 5, dovrai aspettare 12 ore.':'');
  $('#send').disabled=!canSend();
}
setInterval(()=>{ if(user && readyUser===user && !$('#quota').hidden) paintQuota(); },1000);
function watchQuota(u){
  if(quotaUnsub){quotaUnsub();quotaUnsub=null;}
  quotaData=null; paintQuota();
  if(!u)return;
  quotaUnsub=onSnapshot(doc(db,'reportQuota',u.uid),snap=>{quotaData=snap.exists()?snap.data({serverTimestamps:'estimate'}):null; paintQuota();},()=>{$('#quota').hidden=true;});
}
onAuthStateChanged(auth,async u=>{
  const version=++authVersion;
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  if(quotaUnsub){quotaUnsub();quotaUnsub=null;} quotaData=null; quotaFull=false;
  $('#list').replaceChildren(); $('#list-message').textContent=u?'Verifica dell’account…':'Accedi per vedere le segnalazioni.';
  drafts.clear(); stopThreads(); admin=false; user=u; readyUser=null; msg(''); $('#login').hidden=!!u; $('#login').disabled=false;
  if($('#switch-account'))$('#switch-account').hidden=!u;
  $('#identity').textContent=u?(u.displayName||u.email):''; $('#send').disabled=true;
  if(window.UAContact)window.UAContact.setUser(u&&u.emailVerified!==false?u.email:null);
  $('#list-title').textContent='Le tue segnalazioni';
  if($('#auth-message').textContent==='Verifica dell’account…') authMsg('');
  if(u){
    window.dispatchEvent(new Event('ua-reports-auth'));
    try {
      const token=await u.getIdTokenResult();
      if(version!==authVersion || auth.currentUser!==u)return;
      admin=token.claims.email==='gpeluso03@gmail.com' && token.claims.email_verified===true && token.claims.firebase?.sign_in_provider==='google.com';
    } catch(e) {
      if(version!==authVersion || auth.currentUser!==u)return;
      msg('Impossibile verificare i permessi. Riprova aggiornando la pagina.');
      $('#list-message').textContent='Impossibile verificare i permessi.';
      return;
    }
  }
  if(version!==authVersion || auth.currentUser!==u)return;
  readyUser=u;
  watchQuota(u);
  $('#send').disabled=!canSend();
  $('#list-title').textContent=isAdmin()?'Tutte le segnalazioni':'Le tue segnalazioni';
  $('#admin-tools').hidden=!isAdmin();
  $('#report-notices').replaceChildren();
  if(!u){$('#list-message').textContent='Accedi per vedere le segnalazioni.';return}
  $('#list-message').textContent='Caricamento…';
  const ref=collection(db,'reports');
  let initial=true, known=new Map();
  const seenKey='ua-report-seen-v1:'+u.uid;
  try {const saved=JSON.parse(localStorage.getItem(seenKey)||'{}');known=new Map(Object.entries(saved));} catch(e) {known=new Map();}
  renderReports=()=>{
    // se stavi scrivendo una risposta, dopo l'aggiornamento della lista il cursore resta lì
    const ae=document.activeElement, refocus=ae&&ae.dataset&&ae.dataset.replyFor?{id:ae.dataset.replyFor,a:ae.selectionStart,b:ae.selectionEnd}:null;
    $('#list').replaceChildren();
    const term=isAdmin()?$('#report-search').value.trim().toLocaleLowerCase('it'):'';
    const filter=isAdmin()?$('#report-filter').value:'all';
    const order=isAdmin()?$('#report-sort').value:'newest';
    const docs=latestDocs.filter(item=>{const d=item.data();return (filter==='all'||d.status===filter)&&(!term||[d.title,d.message,d.contact,d.authorEmail].some(x=>String(x||'').toLocaleLowerCase('it').includes(term)))});
    docs.sort((a,b)=>{const x=a.data(),y=b.data(),delta=(x.createdAt?.seconds||0)-(y.createdAt?.seconds||0);return order==='oldest'?delta:order==='status'?(String(x.status).localeCompare(String(y.status))||-delta):-delta});
    $('#list-message').textContent=docs.length?'':(latestDocs.length?'Nessuna segnalazione corrisponde alla ricerca.':'Nessuna segnalazione.');
    for(const item of docs){
      const d=item.data(), card=document.createElement('article'), title=document.createElement('h3'), text=document.createElement('p'), badge=document.createElement('span');
      card.className='entry'; title.textContent=d.title; text.textContent=d.message;
      badge.className='status '+(Object.hasOwn(statuses,d.status)?d.status:''); badge.textContent=statuses[d.status]||'Sconosciuta';
      card.append(title,badge);
      const sentAt=reportDateElement(d.createdAt);
      if(sentAt)card.append(sentAt);
      card.append(text);
      if(isAdmin() && d.authorEmail){const account=document.createElement('p');account.textContent='Account Google: '+d.authorEmail;card.append(account)}
      if(d.contact){const c=document.createElement('p');c.className='contact-line';c.append('Contatto: ');if(window.UAContact)c.append(window.UAContact.render(d.contact,document,d.authorEmail));else c.append(String(d.contact));card.append(c)}
      else if(isAdmin()){const c=document.createElement('p');c.className='contact-line';c.textContent='Contatto: risposta qui sul sito';card.append(c)}
      card.append(threadEl(item,d));
      if(isAdmin()){
        /* stato: quattro pulsanti colorati al posto del menu a tendina */
        const group=document.createElement('div'), gl=document.createElement('span'), row=document.createElement('div');
        group.className='status-pick'; gl.className='status-pick-lbl'; gl.id='st-'+item.id; gl.textContent='Stato';
        row.className='status-pick-row'; row.setAttribute('role','radiogroup'); row.setAttribute('aria-labelledby',gl.id);
        const btns=[];
        const paintPick=v=>btns.forEach(b=>{const on=b.dataset.v===v;b.setAttribute('aria-checked',on?'true':'false');b.tabIndex=on?0:-1;});
        for(const [value,name] of Object.entries(statuses)){
          const b=document.createElement('button'); b.type='button'; b.className='status-opt '+value; b.dataset.v=value; b.setAttribute('role','radio'); b.textContent=name;
          b.onclick=async()=>{ if(b.getAttribute('aria-checked')==='true')return; const prev=d.status; paintPick(value); btns.forEach(x=>x.disabled=true);
            try{await updateDoc(doc(db,'reports',item.id),{status:value,updatedAt:serverTimestamp()})}catch(e){paintPick(prev);$('#list-message').textContent='Impossibile aggiornare lo stato.'}finally{btns.forEach(x=>x.disabled=false)} };
          b.onkeydown=e=>{const k=btns.indexOf(b), n=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0; if(n){e.preventDefault();btns[(k+n+btns.length)%btns.length].focus();}};
          btns.push(b); row.append(b);
        }
        paintPick(d.status); group.append(gl,row); card.append(group);
      }
      card.append(composerEl(item,d));
      $('#list').append(card);
    }
    if(refocus){const t=document.querySelector(`textarea[data-reply-for="${refocus.id}"]`);if(t){t.focus({preventScroll:true});try{t.setSelectionRange(refocus.a,refocus.b);}catch(e){}}}
  };
  unsubscribe=onSnapshot(isAdmin()?ref:query(ref,where('userId','==',u.uid)),snap=>{
    if(version!==authVersion)return;
    const current=new Map();
    for(const item of snap.docs){
      const d=item.data(); current.set(item.id,{status:d.status});
      if(!item.metadata.hasPendingWrites){
        const previous=known.get(item.id);
        if(isAdmin() && !previous && d.status==='new')
          reportNotice('Nuova segnalazione',d.title,d.message,d.createdAt);
        else if(!isAdmin() && ((previous && previous.status!==d.status) || (!previous && initial && d.status!=='new')))
          reportNotice('Stato aggiornato',d.title,statuses[d.status]||'Sconosciuta');
      }
    }
    known=current; initial=false;
    if(!snap.metadata.fromCache && !snap.metadata.hasPendingWrites){try{localStorage.setItem(seenKey,JSON.stringify(Object.fromEntries(current)));}catch(e){}}
    latestDocs=snap.docs.slice(); watchThreads(latestDocs,version); renderReports();
  },()=>$('#list-message').textContent='Impossibile caricare le segnalazioni. Riprova più tardi.');
});
function watchThreads(docs,version){
  const ids=new Set(docs.map(x=>x.id));
  threads.forEach((t,id)=>{if(!ids.has(id)){t.unsub&&t.unsub();threads.delete(id);}});
  for(const item of docs){
    if(threads.has(item.id))continue;
    const t={docs:[],unsub:null,seen:new Set(),first:true};
    threads.set(item.id,t);
    t.unsub=onSnapshot(collection(db,'reports',item.id,'messaggi'),snap=>{
      if(version!==authVersion)return;
      t.docs=snap.docs.slice();
      for(const m of snap.docs){
        if(t.seen.has(m.id))continue; t.seen.add(m.id);
        const x=m.data();
        // avviso in pagina per i messaggi nuovi dell'altra persona (non al primo caricamento)
        if(!t.first && !m.metadata.hasPendingWrites && x.uid!==user?.uid){
          const d=latestDocs.find(r=>r.id===item.id)?.data()||{};
          reportNotice(x.da==='admin'?'Nuova risposta dell’amministratore':'Nuova risposta dall’utente',d.title,x.testo,x.createdAt);
        }
      }
      t.first=false;
      renderReports();
    },()=>{});
  }
}
const msgTime=ts=>{const dt=ts?.toDate?.();return dt instanceof Date&&!Number.isNaN(dt.getTime())?reportDateFormat.format(dt).replace(',', ' ·'):'';};
function threadEl(item,d){
  const t=threads.get(item.id), msgs=(t?t.docs:[]).map(m=>m.data({serverTimestamps:'estimate'}));
  msgs.sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0));
  // la risposta scritta prima delle conversazioni (campo adminComment) resta come primo messaggio
  if(d.adminComment) msgs.unshift({da:'admin',testo:d.adminComment});
  const box=document.createElement('div'); box.className='thread';
  if(!msgs.length){box.hidden=true;return box;}
  const h=document.createElement('strong'); h.className='thread-h'; h.textContent='Conversazione'; box.append(h);
  for(const m of msgs){
    const mine=isAdmin()?m.da==='admin':m.da==='utente';
    const el=document.createElement('div'); el.className='msg '+(m.da==='admin'?'msg-admin':'msg-utente')+(mine?' msg-mine':'');
    const who=document.createElement('span'); who.className='msg-who';
    who.textContent=(mine?'Tu':m.da==='admin'?'Amministratore':'Utente')+(msgTime(m.createdAt)?' · '+msgTime(m.createdAt):'');
    const body=document.createElement('p');
    // i link (http/https) diventano cliccabili; il resto resta testo semplice
    String(m.testo||'').split(/(https?:\/\/[^\s<>"]+)/g).forEach((part,k)=>{
      if(k%2){const a=document.createElement('a');a.href=part;a.textContent=part;a.target='_blank';a.rel='noopener noreferrer';body.append(a);}
      else if(part)body.append(part);
    });
    el.append(who,body); box.append(el);
  }
  return box;
}
function composerEl(item,d){
  const max=isAdmin()?MAX_REPLY_ADMIN:MAX_REPLY_USER, key='reply:'+item.id;
  const wrap=document.createElement('div'); wrap.className='composer';
  const label=document.createElement('label'), input=document.createElement('textarea'), send=document.createElement('button'), result=document.createElement('p');
  label.innerHTML=isAdmin()?'Scrivi all’utente <span class="optional">lo vede solo chi ha inviato la segnalazione; gli arriva una notifica</span>':'Rispondi all’amministratore <span class="optional">ad esempio il link o le informazioni che ti ha chiesto</span>';
  input.rows=3; input.maxLength=max; input.dataset.replyFor=item.id; input.placeholder=isAdmin()?'Scrivi una risposta…':'Scrivi la tua risposta…';
  input.value=drafts.get(key)||''; input.oninput=()=>{drafts.set(key,input.value);send.disabled=!input.value.trim();};
  send.type='button'; send.className='save-comment send-reply'; send.textContent='Invia'; send.disabled=!input.value.trim();
  result.setAttribute('role','status'); result.className='composer-msg';
  send.onclick=async()=>{
    const testo=input.value.trim(); if(!testo)return;
    send.disabled=true; result.textContent='Invio…';
    try{
      const r=doc(db,'reports',item.id), m=doc(collection(r,'messaggi')), b=writeBatch(db);
      if(isAdmin()){
        b.set(m,{da:'admin',uid:user.uid,testo,createdAt:serverTimestamp()});
        b.update(r,{lastAdminMsgId:m.id,updatedAt:serverTimestamp()}); // la vecchia risposta (adminComment) resta com'è
      } else {
        b.set(m,{da:'utente',uid:user.uid,testo,createdAt:serverTimestamp()});
        b.update(r,{userReplyAt:serverTimestamp(),lastReplyId:m.id,updatedAt:serverTimestamp()});
      }
      await b.commit();
      drafts.delete(key); input.value=''; result.textContent='Inviata.';
    }catch(e){
      result.textContent=isAdmin()?'Invio non riuscito. Riprova.':'Invio non riuscito. Aspetta qualche secondo tra una risposta e l’altra e controlla la connessione.';
      send.disabled=false;
    }
  };
  label.append(input); wrap.append(label,send,result);
  return wrap;
}
function reportNotice(heading,title,body,createdAt){
  const box=document.createElement('article'), strong=document.createElement('strong'), subject=document.createElement('p'), text=document.createElement('p'), close=document.createElement('button');
  box.className='report-notice';strong.textContent=heading;subject.textContent=title||'';text.textContent=body||'';
  close.type='button';close.textContent='Chiudi';close.onclick=()=>box.remove();
  box.append(strong,subject);
  const sentAt=reportDateElement(createdAt);if(sentAt)box.append(sentAt);
  box.append(text,close);$('#report-notices').prepend(box);
}

$('#form').onsubmit=async e=>{
  e.preventDefault();
  if(!user || readyUser!==user || sending)return;
  if(quotaFull){msg('Hai usato tutte e 5 le segnalazioni: aspetta che finisca il conto alla rovescia.');return}
  const sender=user, form=e.currentTarget, title=form.elements.title.value.trim(), text=form.elements.text.value.trim(), contactRes=window.UAContact?window.UAContact.read():{value:''}, contact=contactRes.value||'';
  if(title.length<3 || text.length<10){msg('Il titolo deve contenere almeno 3 caratteri e il testo almeno 10.');return}
  if(text.length>MAX_TEXT){msg(`Il testo può essere lungo al massimo ${MAX_TEXT} caratteri.`);return}
  if(contactRes.error){msg(contactRes.error);if(contactRes.field)window.UAContact.mark(contactRes.field);return}
  if(contact.length>200){msg('Il contatto è troppo lungo.');return}
  sending=true; $('#send').disabled=true; msg('Invio in corso…');
  try {
    await runTransaction(db,async tx=>{
      const quotaRef=doc(db,'reportQuota',sender.uid), reportRef=doc(collection(db,'reports'));
      const quota=await tx.get(quotaRef), old=quota.exists()?quota.data():null;
      const last=old?.updatedAt?.toMillis?.();
      const count=last && Date.now()<last+QUOTA_WINDOW ? old.count+1 : 1;
      if(count>5)throw new Error('daily-limit');
      tx.set(quotaRef,{count,lastReportId:reportRef.id,updatedAt:serverTimestamp()});
      tx.set(reportRef,{userId:sender.uid,authorEmail:sender.email,title,message:text,contact,status:'new',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    });
    if(user===sender && auth.currentUser===sender){form.reset();paintCounter();msg('Segnalazione inviata','ok');}
  } catch(e) {
    if(user===sender && auth.currentUser===sender)msg(e.message==='daily-limit'?'Hai usato tutte e 5 le segnalazioni: riprova 12 ore dopo la quinta.':'Invio non riuscito. Controlla la connessione, l’accesso Google e la data del dispositivo, poi riprova.');
  } finally {sending=false;$('#send').disabled=!canSend();}
};

