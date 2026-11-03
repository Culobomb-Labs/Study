// Pulizia notturna: le segnalazioni risolte si tolgono dopo 30 giorni, quelle rifiutate dopo 7 (insieme alla
// loro conversazione e al promemoria delle notifiche). Toglie anche i promemoria rimasti senza segnalazione
// (es. segnalazioni eliminate a mano dall'amministratore). Va eseguito solo con le credenziali di servizio.
import { initializeApp, cert } from "firebase-admin/app";
import { FieldPath, Timestamp, getFirestore } from "firebase-admin/firestore";

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (credentials.project_id !== "appunti-unisa") throw new Error("Unexpected Firebase project.");
initializeApp({ credential: cert(credentials), projectId: "appunti-unisa" });
const db = getFirestore();
const DAY = 24 * 60 * 60 * 1000;
const KEEP = { resolved: 30 * DAY, rejected: 7 * DAY }; // quanto restano visibili dopo l'ultima modifica
const expired = v => KEEP[v.status] !== undefined && v.updatedAt instanceof Timestamp && v.updatedAt.toMillis() <= Date.now() - KEEP[v.status];
let cursor = null, scanned = 0, removed = 0;
while (true) {
  let q = db.collection("reports").orderBy(FieldPath.documentId()).limit(200);
  if (cursor) q = q.startAfter(cursor);
  const page = await q.get();
  if (page.empty) break;
  for (const candidate of page.docs) {
    scanned++;
    const d = candidate.data();
    if (!expired(d)) continue;
    const deleted = await db.runTransaction(async tx => {
      const current = await tx.get(candidate.ref);
      if (!current.exists) return false;
      const value = current.data();
      if (!expired(value)) return false;
      tx.delete(candidate.ref);
      tx.delete(db.collection("reportNotify").doc(candidate.id)); // promemoria delle notifiche già inviate
      return true;
    });
    if (deleted) { removed++; await db.recursiveDelete(candidate.ref.collection("messaggi")); } // anche la conversazione
  }
  cursor = page.docs[page.docs.length - 1];
  if (page.size < 200) break;
}
// promemoria delle notifiche rimasti senza segnalazione
let orphans = 0;
for (const n of (await db.collection("reportNotify").get()).docs) {
  if (!(await db.collection("reports").doc(n.id).get()).exists) { await n.ref.delete(); orphans++; }
}
console.log(`Segnalazioni controllate: ${scanned}; eliminate: ${removed}; promemoria orfani tolti: ${orphans}.`);
