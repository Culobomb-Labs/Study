/* Appunti Unisa · service worker: permette di leggere il sito anche senza connessione.
   Lo script di pubblicazione sostituisce __VERSIONE__ e __FILE__ con la versione del sito
   e l'elenco dei file da salvare. Non serve modificarlo a mano. */
const VERSION = "__VERSIONE__";
const PRECACHE = __FILE__;
const CACHE = "appunti-" + VERSION;
const FONTS = "appunti-font";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("appunti-") && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // caratteri di Google Fonts: dalla cache, aggiornati quando possibile
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    event.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // pagine e dati: prima la rete (così vedi sempre la versione nuova), senza rete la copia salvata
  const fresh = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith(".json") || url.pathname.endsWith("/");
  if (fresh) {
    event.respondWith(
      fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // stile, script, immagini: subito dalla cache, aggiornati in sottofondo
  event.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

/* ---------------- news: notifiche ----------------
   La pagina tiene in una cache ("ua-news-stato") l'elenco delle notizie già notificate.
   Se il sito è installato come app (Chrome su Android o PC), il browser ogni tanto sveglia il service worker
   con "periodicsync": qui si controlla news.json e si notificano le notizie nuove. */
const NEWS_STATE = "ua-news-stato";
const stateUrl = () => new URL("__news-notificate", self.registration.scope).href;

async function checkNews() {
  const c = await caches.open(NEWS_STATE);
  const hit = await c.match(stateUrl());
  if (!hit) return; // notifiche mai attivate da questo dispositivo
  const done = await hit.json();
  let news = [];
  try { const r = await fetch(new URL("news.json", self.registration.scope).href, { cache: "no-cache" }); news = (await r.json()).news || []; } catch (e) { return; }
  const fresh = news.filter(n => n && n.id && n.titolo && !done.includes(n.id));
  if (!fresh.length) return;
  await c.put(stateUrl(), new Response(JSON.stringify(done.concat(fresh.map(n => n.id))), { headers: { "Content-Type": "application/json" } }));
  for (const n of fresh.slice(0, 3)) {
    await self.registration.showNotification(n.titolo, {
      body: n.testo || "", tag: "news-" + n.id,
      icon: new URL("icon-192.png", self.registration.scope).href,
      badge: new URL("favicon-32.png", self.registration.scope).href,
      data: { url: new URL("index.html#news", self.registration.scope).href }
    });
  }
}

self.addEventListener("periodicsync", event => {
  if (event.tag === "news") event.waitUntil(checkNews());
});

// Push vero e proprio (arriva anche col sito chiuso): pronto per quando si collega un servizio di invio
self.addEventListener("push", event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { titolo: event.data && event.data.text() }; }
  event.waitUntil(d.titolo
    ? self.registration.showNotification(d.titolo, { body: d.testo || "", tag: "news-" + (d.id || Date.now()), icon: new URL("icon-192.png", self.registration.scope).href, data: { url: new URL("index.html#news", self.registration.scope).href } })
    : checkNews());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const w of list) if (w.url.startsWith(self.registration.scope) && "focus" in w) { w.navigate(target).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(target);
  }));
});
