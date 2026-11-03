// Pubblica firestore.rules sul progetto Firebase (lo lancia l'azione "Pubblica le regole di Firestore",
// dopo averle provate sull'emulatore). Usa la libreria di amministrazione: non serve incollarle nella console.
//   FIREBASE_SERVICE_ACCOUNT  il contenuto del file .json dell'account di servizio (segreto del repository)
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (account.project_id !== "appunti-unisa") throw new Error("Segreto FIREBASE_SERVICE_ACCOUNT mancante o di un altro progetto.");
initializeApp({ credential: cert(account), projectId: "appunti-unisa" });
const source = readFileSync("firestore.rules", "utf8");
const rs = await getSecurityRules().releaseFirestoreRulesetFromSource(source);
console.log(`Regole pubblicate: ${rs.name} (${rs.createTime})`);
