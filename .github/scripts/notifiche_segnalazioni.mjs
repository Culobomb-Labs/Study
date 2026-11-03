// Notifiche delle segnalazioni (Firebase Cloud Messaging), lanciato da GitHub ogni 5 minuti.
//   - all'amministratore: "Nuova segnalazione" per ogni segnalazione arrivata;
//   - a chi l'ha inviata: quando cambia lo stato o arriva un messaggio dell'amministratore;
//   - all'amministratore: quando chi l'ha inviata risponde nella conversazione (reports/<id>/messaggi).
// Il piano gratuito di Firebase non ha Cloud Functions: per questo il controllo lo fa GitHub, a intervalli.
//
// Dove sono i dati (Firestore):
//   reports/<id>               le segnalazioni (le scrive il sito)
//   utenti/<uid>.dispositivi   i codici dei dispositivi di ogni account con le notifiche attive (li scrive il sito)
//   reportNotify/<id>          cosa è già stato notificato per ogni segnalazione (solo questo script)
//   sistema/segnalazioni       quando è stato fatto l'ultimo controllo (solo questo script)
// reportNotify e sistema non sono leggibili né scrivibili dal sito: le regole chiudono tutto ciò che non è elencato.
//
//   FIREBASE_SERVICE_ACCOUNT  il contenuto del file .json dell'account di servizio (segreto del repository)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const SITE_URL = "https://culobomb-labs.github.io/Study/";
const PAGE = SITE_URL + "segnalazioni.html";
const ADMIN_EMAIL = "gpeluso03@gmail.com";
const OVERLAP = 10 * 60 * 1000;        // si ricontrollano anche gli ultimi 10 minuti (orologi, ritardi)
const FIRST_LOOKBACK = 24 * 3600 * 1000; // al primo avvio: le segnalazioni delle ultime 24 ore
const STATUS = { new: "Nuova", in_progress: "In elaborazione", rejected: "Rifiutata", resolved: "Risolta" };
const STATUS_TITLE = {
  new: "Segnalazione di nuovo aperta",
  in_progress: "Segnalazione presa in carico",
  rejected: "Segnalazione rifiutata",
  resolved: "Segnalazione risolta",
};
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

const started = Timestamp.now();
const stateRef = db.collection("sistema").doc("segnalazioni");
const state = await stateRef.get();
const last = state.exists && state.data().controllato instanceof Timestamp ? state.data().controllato.toMillis() : null;
const since = Timestamp.fromMillis(last ? last - OVERLAP : started.toMillis() - FIRST_LOOKBACK);

const changed = await db.collection("reports").where("updatedAt", ">", since).orderBy("updatedAt").get();
console.log(`Segnalazioni cambiate dal ${since.toDate().toISOString()}: ${changed.size}`);

// codici dei dispositivi di un account (letti una volta per account)
const tokensOf = new Map();
async function deviceTokens(uid) {
  if (!uid) return [];
  if (!tokensOf.has(uid)) {
    const snap = await db.collection("utenti").doc(uid).get();
    const map = (snap.exists && snap.data().dispositivi) || {};
    tokensOf.set(uid, Object.keys(map).filter(t => typeof t === "string" && t.length > 20));
  }
  return tokensOf.get(uid);
}
let adminUid;
async function adminTokens() {
  if (adminUid === undefined) {
    try { adminUid = (await getAuth().getUserByEmail(ADMIN_EMAIL)).uid; }
    catch (e) { adminUid = null; console.warn(`Account amministratore non trovato: ${e.code || e}`); }
  }
  return deviceTokens(adminUid);
}

const gone = new Map(); // uid -> codici non più validi
async function send(uid, tokens, msg) {
  if (!tokens.length) return 0;
  const res = await messaging.sendEachForMulticast({
    tokens,
    data: { id: msg.id, titolo: msg.titolo.slice(0, 120), testo: msg.testo.slice(0, 600), url: PAGE },
    webpush: { headers: { Urgency: "high", TTL: String(4 * 24 * 3600) }, fcmOptions: { link: PAGE } },
  });
  let ok = 0;
  res.responses.forEach((r, k) => {
    if (r.success) { ok++; return; }
    const code = r.error && r.error.code;
    if (GONE.has(code)) { if (!gone.has(uid)) gone.set(uid, new Set()); gone.get(uid).add(tokens[k]); }
    else console.warn(`  errore: ${code || r.error}`);
  });
  return ok;
}

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
let sent = 0;
for (const r of changed.docs) {
  const d = r.data();
  const noteRef = db.collection("reportNotify").doc(r.id);
  const noteSnap = await noteRef.get();
  const note = noteSnap.exists ? noteSnap.data() : { admin: false, status: "new", comment: "", reply: "", adminMsg: "" };
  const status = STATUS[d.status] ? d.status : "new";
  const comment = typeof d.adminComment === "string" ? d.adminComment.trim() : "";
  const next = { admin: note.admin, status: note.status, comment: note.comment || "", reply: note.reply || "", adminMsg: note.adminMsg || "", aggiornato: FieldValue.serverTimestamp() };

  // 1. all'amministratore: segnalazione nuova
  if (!note.admin) {
    const tokens = await adminTokens();
    const n = await send(adminUid, tokens, {
      id: `seg-${r.id}-nuova`,
      titolo: `Nuova segnalazione: ${clip(d.title, 80)}`,
      testo: clip(d.message, 200),
    });
    console.log(`  ${r.id}: nuova → amministratore (${n}/${tokens.length} dispositivi)`);
    sent += n;
    next.admin = true;
  }

  // 2. a chi l'ha inviata: stato cambiato e/o messaggio nuovo dell'amministratore (in un'unica notifica).
  //    Il messaggio è l'ultimo della conversazione (lastAdminMsgId) oppure la vecchia risposta unica (adminComment).
  const statusChanged = status !== note.status;
  let adminText = "";
  if (d.lastAdminMsgId && d.lastAdminMsgId !== (note.adminMsg || "")) {
    const m = await r.ref.collection("messaggi").doc(d.lastAdminMsgId).get();
    adminText = m.exists ? String(m.data().testo || "").trim() : "";
    next.adminMsg = d.lastAdminMsgId;
  } else if (comment !== (note.comment || "") && comment !== "") adminText = comment;
  const commentChanged = adminText !== "";
  if ((statusChanged || commentChanged) && d.userId && d.userId !== adminUid) {
    const tokens = await deviceTokens(d.userId);
    const titolo = statusChanged ? STATUS_TITLE[status] : "Nuova risposta alla tua segnalazione";
    const parts = [`“${clip(d.title, 70)}”`];
    if (statusChanged) parts.push(`Stato: ${STATUS[status]}`);
    if (commentChanged) parts.push(`Risposta: ${clip(adminText, 160)}`);
    const n = await send(d.userId, tokens, { id: `seg-${r.id}-${Date.now()}`, titolo, testo: parts.join(" · ") });
    console.log(`  ${r.id}: ${statusChanged ? "stato " + status : ""}${statusChanged && commentChanged ? " + " : ""}${commentChanged ? "risposta" : ""} → autore (${n}/${tokens.length} dispositivi)`);
    sent += n;
  }
  // 3. all'amministratore: chi ha segnalato ha risposto (lastReplyId = il suo ultimo messaggio)
  if (d.lastReplyId && d.lastReplyId !== (note.reply || "")) {
    const m = await r.ref.collection("messaggi").doc(d.lastReplyId).get();
    const testo = m.exists ? m.data().testo : "";
    const tokens = await adminTokens();
    const n = await send(adminUid, tokens, {
      id: `seg-${r.id}-r-${d.lastReplyId}`,
      titolo: `Risposta a “${clip(d.title, 60)}”`,
      testo: clip(testo || "Ha risposto alla segnalazione.", 200),
    });
    console.log(`  ${r.id}: risposta dell'utente → amministratore (${n}/${tokens.length} dispositivi)`);
    sent += n;
    next.reply = d.lastReplyId;
  }
  next.status = status;
  if (comment) next.comment = comment;
  await noteRef.set(next);
}

// tolgo dagli account i dispositivi che Firebase dice non più validi
for (const [uid, set] of gone) {
  const upd = [];
  set.forEach(t => upd.push(new FieldPath("dispositivi", t), FieldValue.delete()));
  await db.collection("utenti").doc(uid).update(...upd).catch(e => console.warn(`  pulizia ${uid}: ${e.code || e}`));
  console.log(`Tolti ${set.size} dispositivi non più validi da un account.`);
}

await stateRef.set({ controllato: started });
console.log(`Notifiche inviate: ${sent}.`);
