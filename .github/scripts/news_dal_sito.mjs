// Pubblica le notizie e gli avvisi scritti dall'amministratore nella pagina News del sito.
// Il sito le salva in Firestore (newsBozze, stato "in-attesa"); qui:
//   1. le aggiungo in cima a Unisa/news.json (con aggiungi_news.py, lo stesso del modulo "Pubblica una news")
//   2. salvo nel repository con un solo commit
//   3. faccio partire la pubblicazione del sito, che manda anche la notifica a chi l'ha attivata
//   4. segno ogni bozza come "pubblicata" (o "errore", con il motivo, se qualcosa va storto)
// Uso: node .github/scripts/news_dal_sito.mjs            (pubblica)
//      node .github/scripts/news_dal_sito.mjs --controlla (scrive solo quante ce ne sono in attesa, per GITHUB_OUTPUT)
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!sa.project_id) { console.log("Manca FIREBASE_SERVICE_ACCOUNT: niente da fare."); process.exit(0); }
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const ADMIN = "gpeluso03@gmail.com";
const CORSI = ["", "IS", "MP", "PD", "SO"];
const snap = await db.collection("newsBozze").where("stato", "==", "in-attesa").get();
const docs = snap.docs.sort((a, b) => (a.get("createdAt")?.toMillis() || 0) - (b.get("createdAt")?.toMillis() || 0));

if (process.argv.includes("--controlla")) {
  console.log(`Notizie dal sito in attesa: ${docs.length}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `in_attesa=${docs.length}\n`);
  process.exit(0);
}
if (!docs.length) { console.log("Nessuna notizia in attesa."); process.exit(0); }

const run = (cmd, args, env = {}) => execFileSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env } });
const fatte = [], errori = [];
for (const d of docs) {
  const n = d.data();
  try {
    // doppio controllo: la bozza deve venire dall'account amministratore
    const u = await (await import("firebase-admin/auth")).getAuth().getUser(n.uid);
    if (u.email !== ADMIN) throw new Error("bozza non scritta dall'amministratore");
    const corso = CORSI.includes(n.corso) ? n.corso : "";
    const out = run("python3", [".github/scripts/aggiungi_news.py"], {
      TITOLO: n.titolo || "", TESTO: n.testo || "", CORSO: corso, LINK: n.link || "",
      IMMAGINE: n.immagine || "", TIPO: n.tipo === "avviso" ? "avviso" : "news", GITHUB_OUTPUT: "",
    });
    const id = JSON.parse(out).id;
    fatte.push({ ref: d.ref, id, titolo: n.titolo });
    console.log(`Aggiunta: ${n.titolo} (${id})`);
  } catch (e) {
    const motivo = String(e.stderr || e.stdout || e.message || e).replace(/::error::/g, "").trim().slice(0, 300);
    errori.push({ ref: d.ref, motivo });
    console.log(`::warning::Non pubblicata "${n.titolo}": ${motivo}`);
  }
}

if (fatte.length) {
  try {
    run("git", ["config", "user.name", "github-actions[bot]"]);
    run("git", ["config", "user.email", "41898283+github-actions[bot]@users.noreply.github.com"]);
    run("git", ["add", "Unisa/news.json"]);
    const msg = fatte.length === 1 ? `News: ${fatte[0].titolo}` : `News dal sito: ${fatte.length} notizie`;
    run("git", ["commit", "-m", msg]);
    run("git", ["push"]);
    run("gh", ["workflow", "run", "pages.yml", "--ref", "main"]);
  } catch (e) {
    const motivo = String(e.stderr || e.message || e).trim().slice(0, 300);
    for (const f of fatte) errori.push({ ref: f.ref, motivo: "salvataggio non riuscito: " + motivo });
    fatte.length = 0;
    console.log(`::error::${motivo}`);
  }
}

const b = db.batch();
for (const f of fatte) b.update(f.ref, { stato: "pubblicata", newsId: f.id, pubblicataAt: FieldValue.serverTimestamp() });
for (const e of errori) b.update(e.ref, { stato: "errore", errore: e.motivo, controllataAt: FieldValue.serverTimestamp() });
await b.commit();
console.log(`Pubblicate ${fatte.length}, con errore ${errori.length}.`);
if (errori.length && !fatte.length) process.exit(1);
