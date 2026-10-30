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
  const qa=doc(another,'reportQuota','another'), r1=doc(collection(another,'reports')), r2=doc(collection(another,'reports'));
  const batch=writeBatch(another);
  const anotherPayload=()=>({...payload(),userId:'another',authorEmail:'another@example.com'});
  batch.set(qa,{count:1,lastReportId:r1.id,updatedAt:serverTimestamp()});
  batch.set(r1,anotherPayload());batch.set(r2,anotherPayload());
  await assertFails(batch.commit());
  console.log('Report security tests passed.');
} finally { await env.cleanup(); }
