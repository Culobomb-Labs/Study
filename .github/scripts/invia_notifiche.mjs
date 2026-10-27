// Manda la notifica delle notizie nuove a tutti i dispositivi iscritti (Firebase Cloud Messaging).
// Lo esegue l'azione di GitHub dopo aver pubblicato il sito.
//   FIREBASE_SERVICE_ACCOUNT  il contenuto del file .json dell'account di servizio (segreto del repository)
//   NUOVE                     elenco JSON delle notizie nuove: [{ id, titolo, testo }]
// I dispositivi iscritti sono i documenti della raccolta "notifiche" in Firestore.
// I codici scaduti o non più validi vengono tolti dall'elenco.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const SITE_URL = "https://culobomb-labs.github.io/Study/";
const GONE = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

const news = JSON.parse(process.env.NUOVE || "[]");
if (!news.length) { console.log("Nessuna notizia nuova."); process.exit(0); }

let account;
try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ""); }
catch {
  console.error("Manca il segreto FIREBASE_SERVICE_ACCOUNT (o non è il contenuto completo del file .json).");
  console.error("Settings → Secrets and variables → Actions → New repository secret.");
  process.exit(1);
}

initializeApp({ credential: cert(account) });
const db = getFirestore();
const messaging = getMessaging();

const tokens = (await db.collection("notifiche").get()).docs.map(d => d.id);
console.log(`Dispositivi iscritti: ${tokens.length}`);
if (!tokens.length) process.exit(0);

const gone = new Set();
// dalla più vecchia alla più recente: la più recente resta in cima tra le notifiche
for (const n of news.slice().reverse()) {
  const url = `${SITE_URL}news.html#${encodeURIComponent(n.id)}`;
  let ok = 0, ko = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500).filter(t => !gone.has(t));
    if (!batch.length) continue;
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      data: { id: String(n.id), titolo: String(n.titolo).slice(0, 120), testo: String(n.testo || "").slice(0, 600), url },
      webpush: { headers: { Urgency: "high", TTL: String(4 * 24 * 3600) }, fcmOptions: { link: url } },
    });
    res.responses.forEach((r, k) => {
      if (r.success) { ok++; return; }
      ko++;
      const code = r.error && r.error.code;
      if (GONE.has(code)) gone.add(batch[k]);
      else console.warn(`  errore: ${code || r.error}`);
    });
  }
  console.log(`"${n.titolo}": inviata a ${ok}, non arrivata a ${ko}`);
}

if (gone.size) {
  const w = db.bulkWriter();
  gone.forEach(t => w.delete(db.collection("notifiche").doc(t)));
  await w.close();
  console.log(`Tolti ${gone.size} dispositivi non più validi.`);
}
