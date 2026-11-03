import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, runTransaction, serverTimestamp, setDoc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';

const env = await initializeTestEnvironment({projectId:'demo-report-rules', firestore:{rules:readFileSync('firestore.rules','utf8')}});
const claims = {email:'reader@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}};
const user = env.authenticatedContext('reader',claims).firestore();
const admin = env.authenticatedContext('admin',{...claims,email:'gpeluso03@gmail.com'}).firestore();
const another = env.authenticatedContext('another',{...claims,email:'another@example.com'}).firestore();
const payload = () => ({userId:'reader',authorEmail:claims.email,title:'Test title',message:'Test message for a report',contact:'',status:'new',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
async function submit(db, uid='reader', countOverride) {
  const quota = doc(db,'reportQuota',uid), report = doc(collection(db,'reports'));
  await runTransaction(db, async tx => {
    const snap=await tx.get(quota);
    const count=countOverride ?? (snap.exists()?snap.data().count+1:1);
    tx.set(quota,{count,lastReportId:report.id,updatedAt:serverTimestamp()});
    tx.set(report,payload());
  });
  return report;
}
try {
  const first=await assertSucceeds(submit(user));
  await assertSucceeds(getDoc(first));
  await assertFails(getDoc(doc(another,'reports',first.id)));
  await assertFails(updateDoc(first,{status:'resolved',updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(admin,'reports',first.id),{status:'in_progress',adminComment:'Working on it',updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(collection(user,'reports')),payload()));
  await assertFails(submit(user,'reader',1));
  for(let i=0;i<4;i++) await assertSucceeds(submit(user));
  await assertFails(submit(user));
  await assertFails(submit(user,'reader',1));
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(),'reportQuota','reader'),{count:5,lastReportId:'old',updatedAt:new Date(Date.now()-3*86400000)});
  });
  await assertSucceeds(submit(user,'reader',1));
  for(let i=0;i<3;i++) await assertSucceeds(submit(user));
  // blocco di 12 ore dalla quinta segnalazione (non a mezzanotte)
  const thirdClaims={...claims,email:'third@example.com'};
  const third=env.authenticatedContext('third',thirdClaims).firestore();
  const submitThird=count=>{
    const quota=doc(third,'reportQuota','third'), report=doc(collection(third,'reports'));
    return runTransaction(third, async tx => {
      await tx.get(quota);
      tx.set(quota,{count,lastReportId:report.id,updatedAt:serverTimestamp()});
      tx.set(report,{...payload(),userId:'third',authorEmail:thirdClaims.email});
    });
  };
  const setThird=(count,hoursAgo)=>env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(),'reportQuota','third'),{count,lastReportId:'old-'+count+'-'+hoursAgo,updatedAt:new Date(Date.now()-hoursAgo*3600000)});
  });
  await setThird(5,11);
  await assertFails(submitThird(1));
  await assertFails(submitThird(6));
  await setThird(5,13);
  await assertFails(submitThird(6));
  await assertSucceeds(submitThird(1));
  await setThird(2,2);
  await assertFails(submitThird(1));
  await assertSucceeds(submitThird(3));
  await setThird(3,15);
  await assertFails(submitThird(4));
  await assertSucceeds(submitThird(1));
  const parallel=await Promise.allSettled([submit(user),submit(user)]);
  if(parallel.filter(x=>x.status==='fulfilled').length!==1) throw new Error('Concurrent submissions exceeded quota');
  const fake=env.authenticatedContext('fake',{...claims,email_verified:false}).firestore();
  await assertFails(getDoc(doc(fake,'reportQuota','fake')));
  const qa=doc(another,'reportQuota','another'), r1=doc(collection(another,'reports')), r2=doc(collection(another,'reports'));
  const batch=writeBatch(another);
  const anotherPayload=()=>({...payload(),userId:'another',authorEmail:'another@example.com'});
  batch.set(qa,{count:1,lastReportId:r1.id,updatedAt:serverTimestamp()});
  batch.set(r1,anotherPayload());batch.set(r2,anotherPayload());
  await assertFails(batch.commit());
  // conversazione: risposte dell'utente e dell'amministratore
  const reply = (db, reportRef, testo) => {
    const r = doc(db, 'reports', reportRef.id), m = doc(collection(r, 'messaggi'));
    const b = writeBatch(db);
    b.set(m, { da: 'utente', uid: 'reader', testo, createdAt: serverTimestamp() });
    b.update(r, { userReplyAt: serverTimestamp(), lastReplyId: m.id, updatedAt: serverTimestamp() });
    return b.commit();
  };
  await assertSucceeds(reply(user, first, 'Ecco il link del drive'));
  await assertFails(reply(user, first, 'subito un altro'));                       // meno di 30 secondi
  await assertFails(reply(another, first, 'non è mia'));                          // non è sua
  await assertFails(reply(user, first, 'x'.repeat(551)));                         // troppo lunga
  {                                                                               // messaggio senza aggiornare la segnalazione
    const m = doc(collection(doc(user, 'reports', first.id), 'messaggi'));
    await assertFails(setDoc(m, { da: 'utente', uid: 'reader', testo: 'ciao', createdAt: serverTimestamp() }));
  }
  {                                                                               // utente che si spaccia per l'amministratore
    const r = doc(user, 'reports', first.id), m = doc(collection(r, 'messaggi')); const b = writeBatch(user);
    b.set(m, { da: 'admin', uid: 'reader', testo: 'finto', createdAt: serverTimestamp() });
    b.update(r, { userReplyAt: serverTimestamp(), lastReplyId: m.id, updatedAt: serverTimestamp() });
    await assertFails(b.commit());
  }
  await assertFails(updateDoc(doc(user, 'reports', first.id), { status: 'resolved', updatedAt: serverTimestamp() }));
  {                                                                               // l'amministratore risponde
    const r = doc(admin, 'reports', first.id), m = doc(collection(r, 'messaggi')); const b = writeBatch(admin);
    b.set(m, { da: 'admin', uid: 'admin', testo: 'Grazie, aggiunto!', createdAt: serverTimestamp() });
    b.update(r, { lastAdminMsgId: m.id, updatedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  }
  const { getDocs } = await import('firebase/firestore');
  await assertSucceeds(getDocs(collection(doc(user, 'reports', first.id), 'messaggi')));
  await assertFails(getDocs(collection(doc(another, 'reports', first.id), 'messaggi')));
  // eliminazione: solo l'amministratore
  const { deleteDoc } = await import('firebase/firestore');
  await assertFails(deleteDoc(doc(user, 'reports', first.id)));
  await assertFails(deleteDoc(doc(another, 'reports', first.id)));
  {
    const msgs = await getDocs(collection(doc(admin, 'reports', first.id), 'messaggi'));
    const b = writeBatch(admin);
    msgs.docs.forEach(m => b.delete(m.ref));
    b.delete(doc(admin, 'reports', first.id));
    await assertSucceeds(b.commit());
  }
  console.log('Report security tests passed.');
} finally { await env.cleanup(); }
