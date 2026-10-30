import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const app = getApps().find(a => a.name === '[DEFAULT]') || initializeApp({apiKey:'AIzaSyAI8QZjC3qSNq33bNBk7Ls19bjanc4-QnQ',authDomain:'appunti-unisa.firebaseapp.com',projectId:'appunti-unisa',storageBucket:'appunti-unisa.firebasestorage.app',messagingSenderId:'682409351930',appId:'1:682409351930:web:728a3ba5a1d23ffe0a0743'});
const auth=getAuth(app), db=getFirestore(app), $=s=>document.querySelector(s);
const statuses={new:'Nuova',rejected:'Rifiutata',resolved:'Risolta'};
let admin=false;
const isAdmin=()=>admin;
let user=null, readyUser=null, unsubscribe=null, sending=false, authVersion=0;
const msg=(s)=>$('#message').textContent=s;
const authMsg=(s)=>$('#auth-message').textContent=s;
auth.languageCode='it';
getRedirectResult(auth).catch(e=>authMsg(e.code==='auth/unauthorized-domain' ? 'Questo indirizzo non è autorizzato per l’accesso Google.' : 'Accesso Google non riuscito. Riprova.'));
$('#login').onclick=async()=>{
  const button=$('#login'); button.disabled=true; authMsg('Apertura di Google…');
  try { await signInWithPopup(auth,new GoogleAuthProvider()); authMsg(''); }
  catch(e) {
    const code=e?.code || '';
    authMsg(code==='auth/unauthorized-domain' ? 'Questo indirizzo non è autorizzato per l’accesso Google.'
      : code==='auth/popup-closed-by-user' ? 'Accesso annullato. Riprova.'
      : code==='auth/popup-blocked' ? 'Il browser ha bloccato la finestra di Google. Consenti le finestre popup per questo sito e riprova.'
      : 'Accesso non riuscito. Verifica la connessione e riprova.');
  } finally { button.disabled=false; }
};
$('#form').elements.text.addEventListener('input',e=>$('#counter').textContent=`${e.target.value.length} / 1500`);
onAuthStateChanged(auth,async u=>{
  const version=++authVersion;
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  $('#list').replaceChildren(); $('#list-message').textContent=u?'Verifica dell’account…':'Accedi per vedere le segnalazioni.';
  admin=false; user=u; readyUser=null; msg(''); $('#login').hidden=!!u; $('#login').disabled=false;
  $('#identity').textContent=u?(u.displayName||u.email):''; $('#send').disabled=true;
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
  $('#send').disabled=!u || sending;
  $('#list-title').textContent=isAdmin(u)?'Tutte le segnalazioni':'Le tue segnalazioni';if(!u){$('#list-message').textContent='Accedi per vedere le segnalazioni.';return}$('#list-message').textContent='Caricamento…';const ref=collection(db,'reports');unsubscribe=onSnapshot(isAdmin(u)?ref:query(ref,where('userId','==',u.uid)),snap=>{ $('#list').replaceChildren();$('#list-message').textContent=snap.empty?'Nessuna segnalazione.':'';for(const item of snap.docs.sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0))){const d=item.data(), card=document.createElement('article'), title=document.createElement('h3'), text=document.createElement('p'), badge=document.createElement('span');card.className='entry';title.textContent=d.title;text.textContent=d.message;badge.className='status '+(Object.hasOwn(statuses,d.status)?d.status:'');badge.textContent=statuses[d.status]||'Sconosciuta';card.append(title,badge,text);if(d.contact){const c=document.createElement('p');c.textContent='Contatto: '+d.contact;card.append(c)}if(isAdmin(u)){const label=document.createElement('label'),select=document.createElement('select');label.textContent='Stato';for(const [value,name] of Object.entries(statuses)){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option)}select.value=d.status;select.onchange=async()=>{select.disabled=true;try{await updateDoc(doc(db,'reports',item.id),{status:select.value,updatedAt:serverTimestamp()})}catch(e){select.value=d.status;$('#list-message').textContent='Impossibile aggiornare lo stato.'}finally{select.disabled=false}};label.append(select);card.append(label)}$('#list').append(card)}},()=>$('#list-message').textContent='Impossibile caricare le segnalazioni. Riprova più tardi.');});
$('#form').onsubmit=async e=>{
  e.preventDefault();
  if(!user || readyUser!==user || sending)return;
  const sender=user, form=e.currentTarget, title=form.elements.title.value.trim(), text=form.elements.text.value.trim(), contact=form.elements.contact.value.trim();
  if(title.length<3 || text.length<10){msg('Il titolo deve contenere almeno 3 caratteri e il testo almeno 10.');return}
  sending=true; $('#send').disabled=true; msg('Invio in corso…');
  try {
    await addDoc(collection(db,'reports'),{userId:sender.uid,title,message:text,contact,status:'new',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    if(user===sender && auth.currentUser===sender){form.reset();$('#counter').textContent='0 / 1500';msg('Segnalazione inviata.');}
  } catch(e) {
    if(user===sender && auth.currentUser===sender)msg('Invio non riuscito. Controlla la connessione e riprova.');
  } finally {sending=false;$('#send').disabled=!user || readyUser!==user;}
};

