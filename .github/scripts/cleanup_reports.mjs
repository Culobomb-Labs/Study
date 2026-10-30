// Remove closed reports after 30 days. Run only with trusted service credentials.
import { initializeApp, cert } from "firebase-admin/app";
import { FieldPath, Timestamp, getFirestore } from "firebase-admin/firestore";

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (credentials.project_id !== "appunti-unisa") throw new Error("Unexpected Firebase project.");
initializeApp({ credential: cert(credentials), projectId: "appunti-unisa" });
const db = getFirestore();
const cutoff = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
const closed = new Set(["resolved", "rejected"]);
let cursor = null, scanned = 0, removed = 0;
while (true) {
  let q = db.collection("reports").orderBy(FieldPath.documentId()).limit(200);
  if (cursor) q = q.startAfter(cursor);
  const page = await q.get();
  if (page.empty) break;
  for (const candidate of page.docs) {
    scanned++;
    const d = candidate.data();
    if (!closed.has(d.status) || !(d.updatedAt instanceof Timestamp) || d.updatedAt.toMillis() > cutoff.toMillis()) continue;
    const deleted = await db.runTransaction(async tx => {
      const current = await tx.get(candidate.ref);
      if (!current.exists) return false;
      const value = current.data();
      if (!closed.has(value.status) || !(value.updatedAt instanceof Timestamp) || value.updatedAt.toMillis() > cutoff.toMillis()) return false;
      tx.delete(candidate.ref);
      return true;
    });
    if (deleted) removed++;
  }
  cursor = page.docs[page.docs.length - 1];
  if (page.size < 200) break;
}
console.log(`Reports scanned: ${scanned}; deleted: ${removed}.`);
