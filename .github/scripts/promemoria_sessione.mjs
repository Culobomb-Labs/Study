// Promemoria del mattino della Sessione d'esami (Firebase Cloud Messaging), lanciato da GitHub una volta al giorno.
// A chi ha una sessione con "Promemoria del mattino" attivo manda una notifica con le attività di oggi
// (o, il giorno dell'esame, un "in bocca al lupo"). Il piano lo prepara il sito (Unisa/assets/sessione.js).
// Il piano gratuito di Firebase non ha Cloud Functions: per questo il controllo lo fa GitHub.
//
// Dove sono i dati (Firestore):
//   utenti/<uid>.progressi["ua-sessione"]  la sessione (testo JSON: cfg, plan, done), sincronizzata dal sito
//   utenti/<uid>.dispositivi               i codici dei dispositivi con le notifiche attive (li scrive il sito)
//   sistema/promemoria                     l'ultimo giorno in cui sono partiti i promemoria (solo questo script)
//
//   FIREBASE_SERVICE_ACCOUNT  il contenuto del file .json dell'account di servizio (segreto del repository)
//   --forza                   manda i promemoria anche se oggi sono già partiti (per le prove a mano)
import { initializeApp, cert } from "firebase-admin/app";
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const SITE_URL = "https://culobomb-labs.github.io/Study/";
const PAGE = SITE_URL + "sessione.html#oggi";
const KEY = "ua-sessione";
const GONE = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

let account;
try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ""); }
catch {
  console.error("Manca il segreto FIREBASE_SERVICE_ACCOUNT (o non è il contenuto completo del file .json).");
  process.exit(1);
}
initializeApp({ credential: cert(account) });
const db = getFirestore();
const messaging = getMessaging();

// oggi, in Italia (il sito salva i giorni in ora locale)
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const stateRef = db.collection("sistema").doc("promemoria");
const state = await stateRef.get();
if (state.exists && state.data().giorno === today && !process.argv.includes("--forza")) {
  console.log(`I promemoria di oggi (${today}) sono già partiti.`);
  process.exit(0);
}

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const fmtMin = m => { m = Math.round(m / 5) * 5; const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r}′` : `${h} h`) : `${r}′`; };
const daysTo = d => Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);

// il testo del promemoria per una sessione, oppure null se oggi non c'è niente da dire
function message(st) {
  const exams = (st.cfg.exams || []).filter(e => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const name = e => e.name || e.code;
  const exam = exams.find(e => e.date === today);
  if (exam) return { titolo: `Oggi c'è l'esame di ${name(exam)}`, testo: "In bocca al lupo! Colazione e niente argomenti nuovi." };
  const day = (st.plan.days || []).find(d => d.date === today && !d.exam);
  const done = st.done || {};
  const tasks = day ? day.tasks.filter(t => t.m > 0 && !done[t.id]) : [];
  if (!tasks.length) return null;
  const items = st.plan.items || {};
  const tot = tasks.reduce((a, t) => a + t.m, 0);
  const list = tasks.slice(0, 3).map(t => { const it = items[t.iid] || {}; return `${it.c || ""}: ${it.t || "attività"}`; });
  const more = tasks.length > 3 ? ` e altre ${tasks.length - 3}` : "";
  const next = exams[0] ? ` · ${exams[0].code} tra ${daysTo(exams[0].date)} giorni` : "";
  return {
    titolo: `Oggi: ${tasks.length === 1 ? "1 attività" : tasks.length + " attività"} · ${fmtMin(tot)}`,
    testo: `${list.join(" · ")}${more}${next}`,
  };
}

const gone = new Map(); // uid -> codici non più validi
let users = 0, sent = 0;
const snap = await db.collection("utenti").get();
for (const doc of snap.docs) {
  const d = doc.data();
  const raw = d.progressi && d.progressi[KEY];
  if (typeof raw !== "string") continue;
  let st;
  try { st = JSON.parse(raw); } catch { continue; }
  if (!st || !st.cfg || !st.cfg.notify || !st.plan) continue;
  const tokens = Object.keys(d.dispositivi || {}).filter(t => typeof t === "string" && t.length > 20);
  if (!tokens.length) continue;
  const msg = message(st);
  if (!msg) continue;
  users++;
  const res = await messaging.sendEachForMulticast({
    tokens,
    data: { id: `sess-${today}`, titolo: clip(msg.titolo, 120), testo: clip(msg.testo, 600), url: PAGE },
    webpush: { headers: { Urgency: "normal", TTL: String(12 * 3600) }, fcmOptions: { link: PAGE } },
  });
  res.responses.forEach((r, k) => {
    if (r.success) { sent++; return; }
    const code = r.error && r.error.code;
    if (GONE.has(code)) { if (!gone.has(doc.id)) gone.set(doc.id, new Set()); gone.get(doc.id).add(tokens[k]); }
    else console.warn(`  errore: ${code || r.error}`);
  });
}

// tolgo dagli account i dispositivi che Firebase dice non più validi
for (const [uid, set] of gone) {
  const upd = [];
  set.forEach(t => upd.push(new FieldPath("dispositivi", t), FieldValue.delete()));
  await db.collection("utenti").doc(uid).update(...upd).catch(e => console.warn(`  pulizia ${uid}: ${e.code || e}`));
  console.log(`Tolti ${set.size} dispositivi non più validi da un account.`);
}

await stateRef.set({ giorno: today, aggiornato: FieldValue.serverTimestamp() });
console.log(`Promemoria del ${today}: ${users} account, ${sent} notifiche inviate.`);
