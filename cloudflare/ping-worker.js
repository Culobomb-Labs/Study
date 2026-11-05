// Cloudflare Worker: fa partire subito l'azione "Notifiche segnalazioni" di GitHub.
// Il sito lo chiama dopo ogni nuova segnalazione, risposta o cambio di stato.
// Segreto da impostare nel Worker:  GITHUB_TOKEN  (token con permesso Actions: Read and write sul solo repository Study)

const ORIGIN = 'https://culobomb-labs.github.io';
const API_KEY = 'AIzaSyAI8QZjC3qSNq33bNBk7Ls19bjanc4-QnQ'; // chiave web di Firebase (pubblica)
const REPO = 'Culobomb-Labs/Study';
const WORKFLOW = 'notifiche-segnalazioni.yml';
const MIN_GAP_MS = 5000; // al massimo un avvio ogni 5 secondi per utente

const recent = new Map();

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };
    const reply = (status) => new Response(null, { status, headers: cors });

    if (req.method === 'OPTIONS') return reply(204);
    if (req.method !== 'POST' || req.headers.get('Origin') !== ORIGIN) return reply(403);

    const token = /^Bearer (.+)$/.exec(req.headers.get('Authorization') || '')?.[1];
    if (!token) return reply(401);

    // Controlla che sia un utente Firebase vero (non serve altro: l'azione è innocua e ripetibile).
    const who = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!who.ok) return reply(401);
    const uid = (await who.json()).users?.[0]?.localId;
    if (!uid) return reply(401);

    const now = Date.now();
    if (now - (recent.get(uid) || 0) < MIN_GAP_MS) return reply(202);
    recent.set(uid, now);
    if (recent.size > 500) recent.clear();

    const gh = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'appunti-unisa-ping',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    return reply(gh.ok ? 204 : 502);
  },
};
