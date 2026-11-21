// Promemoria della Sessione d'esami (Firebase Cloud Messaging), lanciato da GitHub ogni ora.
// Ognuno sceglie nella pagina Sessione, dalle 7 alle 23: "a orari precisi" (da 1 a 4 al giorno, alle ore scelte)
// oppure "ogni tot ore" (ogni 1–4 ore, dalle … alle …). La pagina salva in cfg.ore le ore effettive.
// Il primo promemoria del giorno dice cosa studiare oggi; i successivi ricordano solo le attività di oggi
// non ancora fatte (se è tutto fatto, non partono). Il giorno dell'esame: "in bocca al lupo"; il giorno della
// consegna di un progetto: un avviso. Il piano lo prepara il sito (Unisa/assets/sessione.js).
// Il piano gratuito di Firebase non ha Cloud Functions: per questo il controllo lo fa GitHub.
//
// Dove sono i dati (Firestore):
//   utenti/<uid>.progressi["ua-sessione"]  la sessione (testo JSON: cfg, plan, done), sincronizzata dal sito;
//                                          cfg.notify = promemoria attivi, cfg.ore = ore scelte (es. [10, 18])
//   utenti/<uid>.dispositivi               i codici dei dispositivi con le notifiche attive (li scrive il sito)
//   sistema/promemoria                     inviati: { uid: "AAAA-MM-GGTHH" } = l'ultimo promemoria partito
//                                          per ogni account (solo questo script), così non parte due volte
//
//   FIREBASE_SERVICE_ACCOUNT  il contenuto del file .json dell'account di servizio (segreto del repository)
//   --forza                   manda subito il promemoria a tutti quelli che l'hanno attivo (per le prove a mano)
import { initializeApp, cert } from "firebase-admin/app";
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const SITE_URL = "https://culobomb-labs.github.io/Study/";
const PAGE = SITE_URL + "sessione.html#oggi";
const KEY = "ua-sessione";
const ORE_DEFAULT = [10]; // per le sessioni salvate prima della scelta degli orari
const RITARDO_MAX = 2; // ore: se GitHub parte in ritardo, il promemoria parte lo stesso (ma non più tardi di così)
const FORZA = process.argv.includes("--forza");
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

// giorno e ora in Italia (il sito salva i giorni in ora locale)
const now = new Date();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
const hour = +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(now);
const slotId = h => `${today}T${String(h).padStart(2, "0")}`;

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const fmtMin = m => { m = Math.round(m / 5) * 5; const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r}′` : `${h} h`) : `${r}′`; };
const daysTo = d => Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);

// il testo di un promemoria (first = primo del giorno), oppure null se non c'è niente da dire
function message(st, first) {
  const exams = (st.cfg.exams || []).filter(e => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const name = e => e.name || e.code;
  const exam = exams.find(e => e.date === today);
  if (exam) return first ? { titolo: `Oggi c'è l'esame di ${name(exam)}`, testo: "In bocca al lupo! Colazione e niente argomenti nuovi." } : null;
  const due = (st.cfg.exams || []).filter(e => e.prj && e.prj.on && (e.prj.date || e.date) === today);
  const dueTxt = due.length ? `Oggi consegni il progetto di ${due.map(name).join(" e ")}. ` : "";
  const day = (st.plan.days || []).find(d => d.date === today && !d.exam && !d.due);
  const done = st.done || {};
  const all = day ? day.tasks.filter(t => t.m > 0) : [];
  const tasks = all.filter(t => !done[t.id]);
  const items = st.plan.items || {};
  const tot = tasks.reduce((a, t) => a + t.m, 0);
  const list = tasks.slice(0, 3).map(t => { const it = items[t.iid] || {}; return `${it.c || ""}: ${it.t || "attività"}`; });
  const more = tasks.length > 3 ? ` e altre ${tasks.length - 3}` : "";
  const n = k => (k === 1 ? "1 attività" : `${k} attività`);
  if (first) {
    if (!tasks.length) return due.length ? { titolo: "Consegna del progetto", testo: dueTxt.trim() } : null;
    const next = exams[0] ? ` · ${exams[0].code} tra ${daysTo(exams[0].date)} giorni` : "";
    return { titolo: `Oggi: ${n(tasks.length)} · ${fmtMin(tot)}`, testo: `${dueTxt}${list.join(" · ")}${more}${next}` };
  }
  // promemoria successivi: solo se resta qualcosa di oggi
  if (!tasks.length) return null;
  const fatte = all.length - tasks.length;
  return {
    titolo: `Ti ${tasks.length === 1 ? "manca" : "mancano"} ${n(tasks.length)} di oggi · ${fmtMin(tot)}`,
    testo: `${fatte ? (fatte === 1 ? "Ne hai già fatta 1. " : `Ne hai già fatte ${fatte}. `) : ""}${dueTxt}${list.join(" · ")}${more}`,
  };
}

const stateRef = db.collection("sistema").doc("promemoria");
const state = await stateRef.get();
const inviati = (state.exists && state.data().inviati) || {};
const nuovi = {};
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
  // l'orario scelto più recente già arrivato (al massimo RITARDO_MAX ore fa) e non ancora mandato
  const ore = (Array.isArray(st.cfg.ore) && st.cfg.ore.length ? st.cfg.ore : ORE_DEFAULT).map(Number).sort((a, b) => a - b);
  const due = FORZA ? hour : ore.filter(h => h <= hour && hour - h <= RITARDO_MAX).pop();
  if (due == null) continue;
  const slot = slotId(due);
  if (!FORZA && (inviati[doc.id] || "") >= slot) continue;
  nuovi[doc.id] = slot; // anche se oggi non c'è niente da dire: così non si ricontrolla a ogni giro
  const msg = message(st, FORZA || due === ore[0]);
  if (!msg) continue;
  users++;
  const res = await messaging.sendEachForMulticast({
    tokens,
    data: { id: `sess-${slot}`, titolo: clip(msg.titolo, 120), testo: clip(msg.testo, 600), url: PAGE },
    webpush: { headers: { Urgency: "normal", TTL: String(3 * 3600) }, fcmOptions: { link: PAGE } },
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

if (Object.keys(nuovi).length)
  await stateRef.set({ inviati: nuovi, aggiornato: FieldValue.serverTimestamp() }, { merge: true });
console.log(`Promemoria delle ${hour}:00 del ${today}: ${users} account, ${sent} notifiche inviate.`);
