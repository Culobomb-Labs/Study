/* Appunti Unisa · script comune a tutte le pagine.
   - barra in alto con percorso (home / corso / documento), ricerca e tema
   - tema chiaro / scuro / automatico, ricordato dal browser
   - ricerca nel testo di tutti gli appunti (Ctrl/Cmd + K)
   - pulsanti fluttuanti sulle pagine di appunti (home, cerca, torna su)
   - piccoli effetti sulla home
   Si carica con: <script src=".../assets/site.js" data-root="percorso/della/home/" data-page="percorso/della/pagina"></script> */
(function () {
  // corsivo calligrafico del marchio "Appunti Unisa" nella barra: si carica su tutte le pagine (la home lo carica già da sé)
  if (!document.querySelector('link[href*="Dancing+Script"]')) {
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap";
    document.head.appendChild(f);
  }
  "use strict";

  // alcune pagine lo includono già da sole e la pubblicazione lo aggiunge di nuovo: basta una volta
  if (window.__uaSite) return;
  window.__uaSite = true;
  const me = document.currentScript;
  // pagina aperta nel pannello "Rivedi questo punto" di un quiz
  const EMBED = window.self !== window.top && /[?&]da=quiz\b/.test(location.search);
  const ROOT = (me && me.dataset.root) || "./";
  const PAGE = decodeURIComponent((me && me.dataset.page) || "index.html");
  const IS_HOME = PAGE === "index.html";
  const CORSI = window.CORSI || [];
  const THEME_KEY = "ua-theme";
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const enc = p => p.split("/").map(encodeURIComponent).join("/");
  const url = (p, hash) => ROOT + enc(p) + (hash ? "#" + hash : "");
  const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = s => (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };

  const ICON = {
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/></svg>',
    up: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    sync: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2.5" y="4" width="12" height="9" rx="1.5"/><path d="M6 17h5"/><rect x="16.5" y="8" width="5.5" height="12" rx="1.3"/><path d="M19.25 17.5h0"/></svg>',
    bug: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2l1.9 1.9M16 2l-1.9 1.9"/><path d="M9 7.1V6a3 3 0 0 1 6 0v1.1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9M6.5 9H3.5M20.5 9h-3M6 13H2M22 13h-4M6.5 17.5 3.5 20M17.5 17.5l3 2.5"/></svg>',
    chev: '<svg class="ua-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    swap: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 10.5-4"/><path d="M15 14h7M19 11l3 3-3 3"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
    auto: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/></svg>'
  };

  /* ---------------- dove siamo ---------------- */
  let here = null;
  for (const c of CORSI) for (const d of c.docs) if (d.path === PAGE) here = { c, d };

  /* ---------------- tema ---------------- */
  const THEMES = ["auto", "light", "dark"];
  const LABEL = { auto: "Tema automatico (segue il sistema)", light: "Tema chiaro", dark: "Tema scuro" };
  const getTheme = () => { try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; } };
  function applyTheme(t) {
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll(".ua-theme").forEach(b => { b.innerHTML = ICON[t]; b.dataset.mode = t; b.setAttribute("aria-label", LABEL[t] + ". Clicca per cambiare"); b.title = LABEL[t]; });
  }
  function cycleTheme() {
    const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
    try { next === "auto" ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }
  window.addEventListener("storage", e => { if (e.key === THEME_KEY) applyTheme(getTheme()); });

  /* ---------------- barra in alto ---------------- */
  function buildBar() {
    let bar = document.getElementById("ua-bar");
    if (!bar) { bar = el("div", { id: "ua-bar" }); document.body.prepend(bar); }
    bar.className = "ua-bar";
    bar.setAttribute("role", "banner");
    let crumbs = `<a class="ua-brand" href="${ROOT}index.html"><svg class="ua-logo" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="2" width="14" height="18" rx="2.5" class="ua-logo-c"/><rect x="6" y="2" width="1.6" height="18" class="ua-logo-p" opacity=".35"/><path d="M14 2h3v9l-1.5-1.3L14 11z" class="ua-logo-s"/><rect x="9.2" y="13.5" width="5.5" height="1.6" rx=".8" class="ua-logo-p"/><rect x="9.2" y="16" width="3.6" height="1.6" rx=".8" class="ua-logo-p" opacity=".6"/></svg>Appunti <span class="ua-brand-u">Unisa</span></a>`;
    if (here) {
      crumbs += `<span class="ua-sep" aria-hidden="true">/</span><a class="ua-crumb" href="${ROOT}index.html#${esc(here.c.code.toLowerCase())}">${esc(here.c.name)}</a>`;
      crumbs += `<span class="ua-sep" aria-hidden="true">/</span><span class="ua-dot" style="--c:var(--ua-c-${esc(here.c.color)})" aria-hidden="true"></span><span class="ua-crumb ua-here" aria-current="page">${esc(here.d.name)}</span>`;
    }
    bar.innerHTML = `<div class="ua-bar-in"><svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="uaGrad" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="22" y2="0"><stop offset="0" style="stop-color:var(--ua-c-is)"/><stop offset=".55" style="stop-color:var(--ua-c-pd)"/><stop offset="1" style="stop-color:var(--ua-c-mp)"/></linearGradient><linearGradient id="uaBell" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" style="stop-color:var(--ua-g-bell1)"/><stop offset="1" style="stop-color:var(--ua-g-bell2)"/></linearGradient><linearGradient id="uaSun" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" style="stop-color:var(--ua-g-sun1)"/><stop offset="1" style="stop-color:var(--ua-g-sun2)"/></linearGradient><linearGradient id="uaMoon" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" style="stop-color:var(--ua-g-moon1)"/><stop offset="1" style="stop-color:var(--ua-g-moon2)"/></linearGradient><linearGradient id="uaAuto" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" style="stop-color:var(--ua-g-auto1)"/><stop offset="1" style="stop-color:var(--ua-g-auto2)"/></linearGradient></defs></svg>
      <nav class="ua-crumbs" aria-label="Percorso">${crumbs}</nav>
      <div class="ua-actions">
        <button class="ua-btn ua-open-search" type="button" aria-label="Cerca negli appunti">${ICON.search}<span class="ua-search-label">Cerca</span><span class="ua-kbd">${isMac ? "⌘" : "Ctrl"} K</span></button>
        <button class="ua-btn ua-news-btn" type="button" aria-label="News" title="News" aria-haspopup="dialog" aria-expanded="false">${ICON.bell}<span class="ua-news-dot" hidden></span></button>
        <button class="ua-btn ua-theme" type="button"></button>
        <button class="ua-btn ua-open-sync" type="button" aria-label="Accedi per salvare i progressi" title="Accedi per salvare i progressi">${ICON.user}</button>
      </div></div>`;
    /* alcune pagine hanno un margine laterale sul body: la barra lo scavalca e va da bordo a bordo */
    const fit = () => {
      bar.style.marginLeft = bar.style.marginRight = "0px"; bar.style.width = "";
      const left = bar.getBoundingClientRect().left, full = document.documentElement.clientWidth;
      if (left > 0.5 || bar.offsetWidth < full - 0.5) { bar.style.marginLeft = -left + "px"; bar.style.width = full + "px"; }
    };
    fit(); window.addEventListener("resize", fit);
  }

  /* ---------------- copyright in fondo a ogni pagina ---------------- */
  const COPY_START = 2026;
  function buildCopyright() {
    if (document.querySelector(".ua-copy")) return;
    const y = new Date().getFullYear(), years = y > COPY_START ? `${COPY_START}–${y}` : `${COPY_START}`;
    const foot = el("footer", { class: "ua-copy" + (IS_HOME ? "" : " ua-copy-dock") });
    foot.innerHTML = `<span>© ${years} Culobomb-Labs · Appunti Unisa</span><span>Appunti personali per lo studio. Vietata la copia o la vendita senza permesso.</span>`;
    document.body.append(foot);
    /* alcune pagine hanno un margine laterale sul body: il piè di pagina va da bordo a bordo, come la barra */
    const fit = () => {
      foot.style.marginLeft = "0px"; foot.style.width = "";
      const left = foot.getBoundingClientRect().left, full = document.documentElement.clientWidth;
      if (left > 0.5 || foot.offsetWidth < full - 0.5) { foot.style.marginLeft = -left + "px"; foot.style.width = full + "px"; }
    };
    fit(); window.addEventListener("resize", fit);
  }

  /* ---------------- pulsanti fluttuanti ---------------- */
  function buildDock() {
    const dock = el("div", { class: "ua-dock", role: "navigation", "aria-label": "Navigazione rapida" });
    dock.innerHTML = `<a href="${ROOT}index.html" aria-label="Torna alla home">${ICON.home}<span class="ua-label">Home</span></a>
      <button type="button" class="ua-open-search" aria-label="Cerca negli appunti">${ICON.search}<span class="ua-label">Cerca</span></button>
      <button type="button" class="ua-news-btn" aria-label="News" aria-haspopup="dialog" aria-expanded="false">${ICON.bell}<span class="ua-news-dot" hidden></span></button>
      <button type="button" class="ua-up" aria-label="Torna in cima" tabindex="-1">${ICON.up}</button>`;
    document.body.append(dock);
    const up = dock.querySelector(".ua-up");
    up.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { const on = scrollY > 700; dock.classList.toggle("ua-scrolled", on); up.tabIndex = on ? 0 : -1; ticking = false; });
    }, { passive: true });
  }

  /* ---------------- ricerca ---------------- */
  let pal, input, results, index = null, loading = null, sel = 0, items = [], lastFocus = null;

  function buildPalette() {
    pal = el("div", { class: "ua-pal", role: "dialog", "aria-modal": "true", "aria-label": "Cerca negli appunti", hidden: "" });
    pal.innerHTML = `<div class="ua-veil"></div>
      <div class="ua-panel">
        <label class="ua-field">${ICON.search.replace('width="16" height="16"', 'width="20" height="20"')}
          <input type="search" id="ua-q" placeholder="Cerca negli appunti: es. spirale, deadlock, intent…" autocomplete="off" spellcheck="false" aria-controls="ua-res" aria-autocomplete="list">
          <button type="button" class="ua-close" aria-label="Chiudi">esc</button></label>
        <div class="ua-results" id="ua-res" role="listbox" aria-label="Risultati"></div>
        <div class="ua-foot"><span><span class="ua-kbd">↑</span><span class="ua-kbd">↓</span> scegli</span><span><span class="ua-kbd">↵</span> apri</span><span><span class="ua-kbd">esc</span> chiudi</span></div>
      </div>`;
    document.body.append(pal);
    input = pal.querySelector("input"); results = pal.querySelector(".ua-results");
    pal.querySelector(".ua-veil").addEventListener("click", closeSearch);
    pal.querySelector(".ua-close").addEventListener("click", closeSearch);
    input.addEventListener("input", () => { sel = 0; render(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); const a = items[sel]; if (a) go(a); }
    });
    pal.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
      if (e.key === "Tab") { e.preventDefault(); input.focus(); }
    });
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch(ROOT + "search-index.json").then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return null;
      j.secs.forEach(s => { s._t = norm(s.t); s._x = norm(s.x); });
      return (index = j);
    }).catch(() => null);
    return loading;
  }

  /* Su PC/Mac la ricerca si apre "dentro" il pulsante Cerca della barra: il pulsante si allarga verso sinistra
     e diventa il campo, con i risultati che scendono sotto. Su telefono (o se la barra non si vede) resta
     la finestra al centro. */
  function searchAnchor() {
    if (innerWidth <= 640) return null;
    const b = document.querySelector(".ua-bar .ua-open-search");
    if (!b || !b.offsetWidth) return null;
    const r = b.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight ? r : null;
  }
  function placeSearch() {
    const r = searchAnchor();
    pal.classList.toggle("is-anchored", !!r);
    if (!r) return;
    const FIELD = 48;
    pal.style.setProperty("--ay", Math.max(6, r.top + r.height / 2 - FIELD / 2) + "px");
    pal.style.setProperty("--ar", Math.max(12, innerWidth - r.right) + "px");
    pal.style.setProperty("--aw", r.width + "px");
  }
  window.addEventListener("resize", () => { if (pal && !pal.hidden) placeSearch(); });

  function openSearch(prefill) {
    closeNewsPanel(true);
    lastFocus = document.activeElement;
    placeSearch();
    pal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    if (typeof prefill === "string") input.value = prefill;
    input.focus(); input.select();
    sel = 0; render();
    loadIndex().then(() => render());
  }
  function closeSearch() {
    pal.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function snippet(x, xn, terms) {
    let at = -1;
    for (const t of terms) { const i = xn.indexOf(t); if (i !== -1 && (at === -1 || i < at)) at = i; }
    if (at === -1) return esc(x.slice(0, 150)) + (x.length > 150 ? "…" : "");
    const start = Math.max(0, at - 50), end = Math.min(x.length, at + 130);
    let piece = x.slice(start, end), pn = xn.slice(start, end), out = "", i = 0;
    while (i < piece.length) {
      let hit = 0;
      for (const t of terms) if (t && pn.startsWith(t, i) && t.length > hit) hit = t.length;
      if (hit) { out += "<mark>" + esc(piece.slice(i, i + hit)) + "</mark>"; i += hit; }
      else { out += esc(piece[i]); i++; }
    }
    return (start > 0 ? "…" : "") + out + (end < x.length ? "…" : "");
  }

  function courseOf(path) { for (const c of CORSI) for (const d of c.docs) if (d.path === path) return { c, d }; return null; }

  function render() {
    const q = norm(input.value).trim();
    const terms = q.split(/\s+/).filter(Boolean);
    let html = ""; items = [];
    const add = (group, list) => {
      if (!list.length) return;
      html += `<div class="ua-group">${group}</div>`;
      for (const it of list) {
        const id = "ua-r" + items.length;
        items.push(it);
        html += `<a class="ua-hit" id="${id}" role="option" href="${it.href}" data-i="${items.length - 1}" aria-selected="false">
          <span class="ua-dot" style="--c:var(--ua-c-${esc(it.color)})" aria-hidden="true"></span>
          <span class="ua-hit-t">${it.title}${it.tag ? `<small>${esc(it.tag)}</small>` : ""}</span>
          <span class="ua-hit-x">${it.text}</span></a>`;
      }
    };

    const docs = [];
    for (const c of CORSI) for (const d of c.docs) {
      const hay = norm(c.name + " " + c.code + " " + d.name + " " + d.kind + (c.resto ? " resto " + c.resto : ""));
      if (!terms.length || terms.every(t => hay.includes(t)))
        docs.push({ href: url(d.path), path: d.path, color: c.color, title: esc(d.name), tag: c.code, text: esc(c.name + " · " + d.kind + (c.resto ? " · Resto " + c.resto : "")) });
    }

    const secs = [];
    if (terms.length && index) {
      for (const s of index.secs) {
        if (!terms.every(t => s._t.includes(t) || s._x.includes(t))) continue;
        let score = 0;
        for (const t of terms) {
          if (s._t.includes(t)) score += 20;
          let n = 0, i = s._x.indexOf(t);
          while (i !== -1 && n < 8) { n++; i = s._x.indexOf(t, i + t.length); }
          score += n;
        }
        const info = courseOf(s.p);
        secs.push({ score, href: url(s.p, s.i), path: s.p, hash: s.i, color: info ? info.c.color : "",
          title: (s.n ? `<span style="color:var(--ua-muted)">${esc(s.n)}</span>&nbsp; ` : "") + esc(s.t),
          tag: info ? info.c.code : "", text: snippet(s.x, s._x, terms) });
      }
      secs.sort((a, b) => b.score - a.score);
    }

    add(terms.length ? "Documenti" : "Tutti i documenti", docs.slice(0, 8));
    add("Nei capitoli", secs.slice(0, 40));
    if (!items.length) {
      html = terms.length && !index && loading ? `<p class="ua-empty">Carico gli appunti…</p>`
        : `<p class="ua-empty">Nessun risultato per “${esc(input.value)}”. Prova con un'altra parola.</p>`;
    }
    results.innerHTML = html;
    results.querySelectorAll(".ua-hit").forEach(a => {
      a.addEventListener("mousemove", () => { const i = +a.dataset.i; if (i !== sel) { sel = i; mark(); } });
      a.addEventListener("click", e => { e.preventDefault(); go(items[+a.dataset.i]); });
    });
    if (sel >= items.length) sel = 0;
    mark(false);
  }
  function mark(scroll = true) {
    results.querySelectorAll(".ua-hit").forEach((a, i) => a.setAttribute("aria-selected", i === sel ? "true" : "false"));
    const cur = results.querySelector(`#ua-r${sel}`);
    if (cur) { input.setAttribute("aria-activedescendant", cur.id); if (scroll) cur.scrollIntoView({ block: "nearest" }); }
  }
  function move(d) { if (!items.length) return; sel = (sel + d + items.length) % items.length; mark(); }
  function go(it) {
    if (it.path === PAGE && it.hash) {
      closeSearch();
      const t = document.getElementById(it.hash);
      if (t) { history.replaceState(null, "", "#" + it.hash); t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    }
    location.href = it.href;
  }

  /* ---------------- sposta i progressi tra dispositivi ----------------
     Le spunte (piano di studio, capitoli fatti) stanno nel browser. Qui le impacchettiamo
     in un link /QR: aprendolo sull'altro dispositivo vengono copiate lì. */
  const SKIP_KEYS = [THEME_KEY];
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

  function collectProgress() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (SKIP_KEYS.includes(k)) continue;
        let v = localStorage.getItem(k);
        try { // togliamo le caselle non spuntate: il link resta corto
          const o = JSON.parse(v);
          if (o && typeof o === "object" && !Array.isArray(o)) { for (const x in o) if (o[x] === false) delete o[x]; v = JSON.stringify(o); }
        } catch (e) {}
        data[k] = v;
      }
    } catch (e) {}
    return data;
  }
  const countChecks = data => Object.values(data).reduce((n, v) => {
    try { const o = JSON.parse(v); if (o && typeof o === "object") return n + Object.values(o).filter(x => x === true).length; } catch (e) {}
    return n;
  }, 0);

  let sync;
  function buildSyncDialog() {
    sync = el("div", { class: "ua-pal ua-sync", role: "dialog", "aria-modal": "true", "aria-labelledby": "ua-sync-t", hidden: "" });
    sync.innerHTML = `<div class="ua-veil"></div><div class="ua-panel ua-sync-panel"><div class="ua-sync-body"></div></div>`;
    document.body.append(sync);
    sync.querySelector(".ua-veil").addEventListener("click", closeSync);
    sync.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); closeSync(); } });
  }
  function showSync(html) {
    lastFocus = document.activeElement;
    sync.querySelector(".ua-sync-body").innerHTML = html;
    sync.hidden = false;
    document.documentElement.style.overflow = "hidden";
    const f = sync.querySelector("[data-focus]") || sync.querySelector("button");
    if (f) f.focus();
    sync.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeSync));
  }
  function closeSync() {
    sync.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function loadQrLib() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    return new Promise((ok, ko) => {
      const s = el("script", { src: ROOT + "assets/qrcode.min.js" });
      s.onload = () => ok(window.qrcode); s.onerror = ko; document.head.append(s);
    });
  }

  /* Il link/QR porta solo le spunte (le chiavi progressKey di corsi.js), e solo quelle messe:
     { chiave: ["id1","id2",…] }. Così resta abbastanza corto per un QR.
     I link vecchi (tutto il contenuto del browser) si possono ancora importare. */
  function exportData() {
    const out = {};
    PROGRESS_KEYS.forEach(k => {
      try {
        const o = JSON.parse(localStorage.getItem(k) || "null");
        if (o && typeof o === "object") { const on = Object.keys(o).filter(x => o[x] === true); if (on.length) out[k] = on; }
      } catch (e) {}
    });
    return out;
  }
  const exportCount = d => Object.values(d).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  function exportLink() {
    const d = exportData();
    return { n: exportCount(d), link: new URL(ROOT + "index.html", location.href).href + "#sync=" + b64(JSON.stringify({ v: 2, s: d })) };
  }
  function fillExport(box) {
    const { n, link } = exportLink();
    box.innerHTML = `<p class="ua-ap-p">${n ? `Su questo dispositivo hai <b>${n}</b> ${n === 1 ? "spunta" : "spunte"} (piano di studio e capitoli fatti).` : "Su questo dispositivo non hai ancora spunte da spostare."}
        Inquadra il codice con la fotocamera dell'altro dispositivo, oppure copia il link e aprilo lì.</p>
      <div class="ua-qr ua-ap-qr" aria-label="Codice QR con le tue spunte"><span class="ua-qr-wait">Preparo il codice…</span></div>
      <div class="ua-sync-row">
        <input class="ua-sync-link" readonly value="${esc(link)}" aria-label="Link con le spunte">
        <button type="button" class="ua-btn ua-sync-copy">Copia link</button>
      </div>
      <p class="ua-ap-note">Sull'altro dispositivo le spunte vengono <b>sostituite</b> con queste. Il link contiene solo le spunte, niente dati personali.</p>`;
    const copy = box.querySelector(".ua-sync-copy"), inp = box.querySelector(".ua-sync-link");
    copy.addEventListener("click", () => {
      const done = () => { copy.textContent = "Copiato ✓"; setTimeout(() => (copy.textContent = "Copia link"), 1800); };
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(done).catch(() => { inp.select(); try { document.execCommand("copy"); done(); } catch (e) {} });
    });
    inp.addEventListener("focus", () => inp.select());
    const q = box.querySelector(".ua-qr");
    loadQrLib().then(qrcode => {
      const qr = qrcode(0, "L"); qr.addData(link); qr.make();
      q.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }).catch(() => { q.innerHTML = '<span class="ua-qr-wait">Troppe spunte per un QR: usa “Copia link”.</span>'; });
  }

  function checkImport() {
    const m = location.hash.match(/^#sync=([A-Za-z0-9_-]+)/);
    if (!m) return;
    let data;
    try { data = JSON.parse(unb64(m[1])); } catch (e) { data = null; }
    history.replaceState(null, "", location.pathname + location.search);
    if (!data || typeof data !== "object") {
      showSync(`<h2 class="ua-sync-t" id="ua-sync-t">Link non valido</h2><p class="ua-sync-p">Il link dei progressi è incompleto. Rigeneralo dall'altro dispositivo e riprova.</p><div class="ua-sync-actions"><button type="button" class="ua-btn" data-close data-focus>Chiudi</button></div>`);
      return;
    }
    if (data.v === 2 && data.s && typeof data.s === "object") { // formato nuovo: { chiave: [id spuntati] }
      const conv = {};
      for (const k in data.s) if (Array.isArray(data.s[k])) { const o = {}; data.s[k].forEach(id => (o[id] = true)); conv[k] = JSON.stringify(o); }
      data = conv;
    }
    const n = countChecks(data), here = countChecks(collectProgress());
    showSync(`<h2 class="ua-sync-t" id="ua-sync-t">Importare i progressi?</h2>
      <p class="ua-sync-p">Il link contiene <b>${n}</b> ${n === 1 ? "spunta" : "spunte"}. ${here ? `Su questo dispositivo ne hai ${here}: verranno sostituite.` : ""}</p>
      <div class="ua-sync-actions"><button type="button" class="ua-btn" data-close>Annulla</button><button type="button" class="ua-btn ua-btn-solid ua-do-import" data-focus>Importa</button></div>`);
    sync.querySelector(".ua-do-import").addEventListener("click", () => {
      try { for (const k in data) if (!SKIP_KEYS.includes(k) && typeof data[k] === "string") localStorage.setItem(k, data[k]); } catch (e) {}
      showSync(`<h2 class="ua-sync-t" id="ua-sync-t">Fatto ✓</h2><p class="ua-sync-p">Progressi importati. Apri il piano di studio o i quaderni: trovi le stesse spunte dell'altro dispositivo.</p><div class="ua-sync-actions"><button type="button" class="ua-btn ua-btn-solid" data-close data-focus>Ok</button></div>`);
    });
  }

  /* ---------------- accesso con Google: spunte salvate online (Firebase) ----------------
     Chi accede con Google ritrova le stesse spunte su tutti i dispositivi.
     Le pagine continuano a salvare nel browser come sempre: qui ascoltiamo quei salvataggi e li copiamo
     su Firestore (documento utenti/<id>), e viceversa copiamo nel browser quelli fatti altrove.
     La libreria di Firebase si scarica solo per chi ha fatto l'accesso o attiva le notifiche.
     Le chiavi qui sotto sono pubbliche per natura: i dati li proteggono le regole di sicurezza di Firestore. */
  const T0 = Date.now();
  const FB_V = "13.1.0";
  const FB_URL = m => `https://www.gstatic.com/firebasejs/${FB_V}/firebase-${m}.js`;
  const FB_CONFIG = {
    apiKey: "AIzaSyAI8QZjC3qSNq33bNBk7Ls19bjanc4-QnQ",
    authDomain: "appunti-unisa.firebaseapp.com",
    projectId: "appunti-unisa",
    storageBucket: "appunti-unisa.firebasestorage.app",
    messagingSenderId: "682409351930",
    appId: "1:682409351930:web:728a3ba5a1d23ffe0a0743"
  };
  const FB_VAPID = "BDF4bbxkQpLtnCEwTAuHnmPnNcEznKknF_QaEfQ910ATwDbu31pTlv0GUs-lhgVyfAieSh02-4zKnOG6V1nl45k";
  const CLOUD_ON = "ua-cloud", CLOUD_UID = "ua-cloud-uid", CLOUD_DIRTY = "ua-cloud-dirty", CLOUD_MSG = "ua-cloud-msg";
  const PROGRESS_KEYS = new Set();
  CORSI.forEach(c => c.docs.forEach(d => { if (d.progressKey) PROGRESS_KEYS.add(d.progressKey); }));
  // cosa si sincronizza: le spunte (progressKey in corsi.js) e i risultati dei quiz (chiavi "quiz-...")
  const isSynced = k => typeof k === "string" && (PROGRESS_KEYS.has(k) || k.startsWith("quiz-"));
  const IS_QUIZ = !!(here && here.d.kind === "Quiz");
  const usesKey = k => IS_HOME || (here && here.d.progressKey === k) || (IS_QUIZ && k.startsWith("quiz-"));

  const origSet = Storage.prototype.setItem, origRemove = Storage.prototype.removeItem;
  let LS = null; try { LS = window.localStorage; } catch (e) {}
  const rawGet = k => { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } };
  const rawSet = (k, v) => { try { if (LS) origSet.call(LS, k, v); } catch (e) {} };
  const rawDel = k => { try { if (LS) origRemove.call(LS, k); } catch (e) {} };
  const dirtyList = () => { try { return JSON.parse(rawGet(CLOUD_DIRTY)) || []; } catch (e) { return []; } };
  const cloudOn = () => rawGet(CLOUD_ON) === "1";

  let fbCore = null, fbAuthP = null, fbNow = null;
  let cloudUser = null, cloudRef = null, cloudUnsub = null, cloudTimer = null, cloudBusy = false;

  function fbLoad() {
    if (!fbCore) {
      fbCore = Promise.all([import(FB_URL("app")), import(FB_URL("firestore"))]).then(([a, fs]) => {
        const app = a.getApps().length ? a.getApp() : a.initializeApp(FB_CONFIG);
        return { a, fs, app, db: fs.getFirestore(app) };
      });
      fbCore.catch(() => { fbCore = null; }); // senza rete: si riprova la volta dopo
    }
    return fbCore;
  }
  function fbAuth() {
    if (!fbAuthP) {
      fbAuthP = Promise.all([fbLoad(), import(FB_URL("auth"))]).then(([c, au]) => {
        const auth = au.getAuth(c.app);
        auth.languageCode = "it";
        au.onAuthStateChanged(auth, onUser);
        return (fbNow = Object.assign({}, c, { au, auth }));
      });
      fbAuthP.catch(() => { fbAuthP = null; });
    }
    return fbAuthP;
  }

  // La pagina delle segnalazioni condivide lo stesso accesso e la sincronizzazione.
  window.addEventListener("ua-reports-auth", () => { fbAuth().catch(() => {}); });

  // ogni volta che una pagina salva una spunta, la segniamo "da inviare"
  function watchStorage() {
    if (!LS) return;
    const mark = k => {
      if (!cloudOn() || !isSynced(k)) return;
      const d = dirtyList();
      if (!d.includes(k)) { d.push(k); rawSet(CLOUD_DIRTY, JSON.stringify(d)); }
      clearTimeout(cloudTimer); cloudTimer = setTimeout(pushDirty, 700);
    };
    Storage.prototype.setItem = function (k, v) { origSet.call(this, k, v); if (this === LS) mark(String(k)); };
    Storage.prototype.removeItem = function (k) { origRemove.call(this, k); if (this === LS) mark(String(k)); };
    const flush = () => { if (dirtyList().length) { clearTimeout(cloudTimer); pushDirty(); } };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    window.addEventListener("online", flush);
  }

  async function pushDirty() {
    if (!cloudUser || !cloudRef || cloudBusy) return;
    const keys = dirtyList();
    if (!keys.length) return;
    cloudBusy = true;
    try {
      const { fs } = await fbLoad();
      const sent = {}, prog = {};
      keys.forEach(k => { const v = rawGet(k); sent[k] = v; prog[k] = v === null ? fs.deleteField() : v; });
      await fs.setDoc(cloudRef, { progressi: prog, aggiornato: fs.serverTimestamp() }, { merge: true });
      // tolgo dall'elenco solo quello che non è cambiato di nuovo nel frattempo
      rawSet(CLOUD_DIRTY, JSON.stringify(dirtyList().filter(k => !(k in sent) || rawGet(k) !== sent[k])));
    } catch (e) { /* senza rete: resta "da inviare" e riparte alla prossima occasione */ }
    finally { cloudBusy = false; }
    if (dirtyList().length) { clearTimeout(cloudTimer); cloudTimer = setTimeout(pushDirty, 5000); }
  }

  // unione delle spunte al primo accesso: una spunta messa su un dispositivo resta messa
  function mergeAny(x, y) {
    const obj = o => o && typeof o === "object" && !Array.isArray(o);
    if (typeof x === "boolean" && typeof y === "boolean") return x || y;
    if (obj(x) && obj(y)) {
      if (typeof x.v === "number" && typeof y.v === "number") return x.v >= y.v ? x : y; // statistiche dei quiz: vince chi ha visto di più
      const o = Object.assign({}, y);
      for (const k in x) o[k] = k in y ? mergeAny(x[k], y[k]) : x[k];
      return o;
    }
    return x === undefined ? y : x;
  }
  function mergeVal(local, remote) {
    if (local === null) return typeof remote === "string" ? remote : null;
    if (typeof remote !== "string") return local;
    try { return JSON.stringify(mergeAny(JSON.parse(local), JSON.parse(remote))); } catch (e) { return local; }
  }
  function localSyncedKeys() {
    const out = [];
    try { for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (isSynced(k)) out.push(k); } } catch (e) {}
    return out;
  }

  async function linkAccount(user, switched) {
    const { fs, db } = await fbLoad();
    cloudRef = fs.doc(db, "utenti", user.uid);
    if (rawGet(CLOUD_UID) !== user.uid) {
      // primo accesso su questo dispositivo: unisco le spunte del browser con quelle online
      const snap = await fs.getDoc(cloudRef);
      const remote = (snap.exists() && snap.data().progressi) || {};
      const keys = new Set(localSyncedKeys().concat(Object.keys(remote).filter(isSynced)));
      const out = {};
      let touched = false;
      keys.forEach(k => {
        const m = mergeVal(rawGet(k), remote[k]);
        if (m === null) return;
        out[k] = m;
        if (rawGet(k) !== m) { rawSet(k, m); if (usesKey(k)) touched = true; }
      });
      await fs.setDoc(cloudRef, { progressi: out, aggiornato: fs.serverTimestamp() }, { merge: true });
      rawSet(CLOUD_UID, user.uid);
      rawSet(CLOUD_DIRTY, "[]");
      if (switched) { // la pagina mostra ancora le spunte dell'altro account: ricarico con quelle nuove
        try { sessionStorage.setItem(CLOUD_MSG, "Ora sei entrato con " + (user.email || "l'altro account") + ": vedi le sue spunte."); } catch (e) {}
        location.reload();
        return;
      }
      if (touched) {
        try { sessionStorage.setItem(CLOUD_MSG, "Accesso fatto: le spunte sono state unite con quelle del tuo account."); } catch (e) {}
        location.reload();
        return;
      }
      toast("Accesso fatto: le spunte ora si salvano sul tuo account.");
    } else {
      await pushDirty();
    }
    listenCloud();
  }

  // aggiornamenti in tempo reale dagli altri dispositivi
  function listenCloud() {
    if (!cloudRef) return;
    let first = true;
    fbLoad().then(({ fs }) => {
      if (cloudUnsub) cloudUnsub();
      cloudUnsub = fs.onSnapshot(cloudRef, snap => {
        if (snap.metadata.hasPendingWrites) return;
        const remote = (snap.exists() && snap.data().progressi) || {};
        const dirty = new Set(dirtyList());
        const changed = [];
        for (const k in remote) {
          if (!isSynced(k) || dirty.has(k) || typeof remote[k] !== "string" || rawGet(k) === remote[k]) continue;
          rawSet(k, remote[k]);
          changed.push(k);
        }
        if (changed.some(usesKey)) remoteChanged(first);
        first = false;
      }, () => {});
    });
  }

  let reloadOnShow = false;
  function remoteChanged(first) {
    // la pagina ha già disegnato le spunte vecchie: la ricarico (mai a metà di un quiz)
    if (!IS_QUIZ && first && Date.now() - T0 < 10000) { location.reload(); return; }
    if (!IS_QUIZ && document.hidden) { reloadOnShow = true; return; }
    toast("Spunte aggiornate da un altro dispositivo.", "Aggiorna", () => location.reload());
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && reloadOnShow) location.reload(); });

  function onUser(user) {
    const prev = cloudUser;
    const switched = !!(prev && user && prev.uid !== user.uid);
    if (switched) {
      // cambio di account senza uscire: questo dispositivo non riceve più le notifiche dell'account di prima
      const t = lsGet(PUSH_TOKEN, null);
      if (t) fbLoad().then(c => c.fs.setDoc(c.fs.doc(c.db, "utenti", prev.uid), { dispositivi: { [t]: c.fs.deleteField() } }, { merge: true })).catch(() => {});
      try { localStorage.removeItem(PUSH_LINK); } catch (e) {}
      // le spunte del browser sono già nell'account di prima: le tolgo, così il nuovo account parte dalle sue
      // (nessuna spunta passa da un account all'altro)
      localSyncedKeys().forEach(rawDel);
      rawSet(CLOUD_DIRTY, "[]");
      rawDel(CLOUD_UID);
    }
    cloudUser = user || null;
    if (cloudUnsub) { cloudUnsub(); cloudUnsub = null; }
    if (user) {
      rawSet(CLOUD_ON, "1");
      setTimeout(() => pushLinkUser().catch(() => {}), 1500);
      linkAccount(user, switched).catch(() => toast("Non riesco a raggiungere il tuo account. Le spunte restano salvate qui e si inviano appena torna la rete."));
    } else {
      cloudRef = null;
      [CLOUD_ON, CLOUD_UID, CLOUD_DIRTY].forEach(rawDel);
    }
    paintAccount();
    if (ap && !ap.hidden) renderAccount();
  }

  // Google mostra sempre la scelta dell'account, invece di entrare da solo con l'ultimo usato
  const googleProvider = A => { const p = new A.au.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return p; };

  /* "Accedi con un altro account": si sceglie un altro account Google senza uscire prima.
     Le spunte di questo browser sono già salvate nell'account di prima: per non mescolarle con quelle del nuovo
     account, se l'account cambia davvero le spunte del browser lasciano il posto a quelle del nuovo (vedi onUser).
     Se si annulla o si sceglie lo stesso account, non cambia niente. */
  async function switchAccount(btn, err) {
    const say = m => { if (err) { err.innerHTML = m; err.hidden = !m; } };
    say("");
    if (btn) { btn.disabled = true; }
    try {
      await pushDirty();
      if (dirtyList().length) { say("Alcune spunte non sono ancora salvate nel tuo account (manca la rete?). Riprova quando sei online."); return; }
      const A = fbNow || await fbAuth();
      await A.au.signInWithPopup(A.auth, googleProvider(A));
    } catch (e) {
      const code = (e && e.code) || "";
      if (!/popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(code))
        say(/popup-blocked/.test(code) ? "Il browser ha bloccato la finestra di Google: consenti i popup per questo sito e riprova."
          : /network/.test(code) ? "Serve la connessione a internet. Riprova quando sei online." : "Cambio account non riuscito. Riprova tra poco.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function signIn(btn, err) {
    const say = m => { err.innerHTML = m; err.hidden = !m; };
    say("");
    btn.disabled = true; btn.textContent = "Apro Google…";
    const reset = () => { btn.disabled = false; btn.textContent = "Accedi con Google"; };
    let A = fbNow;
    try {
      if (!A) A = await fbAuth();
      await A.au.signInWithPopup(A.auth, googleProvider(A));
    } catch (e) {
      const code = (e && e.code) || "";
      if (A && /popup-blocked|operation-not-supported/.test(code)) { // finestra bloccata: si passa dalla pagina di Google
        rawSet(CLOUD_ON, "1");
        try { await A.au.signInWithRedirect(A.auth, googleProvider(A)); return; } catch (e2) {}
      }
      reset();
      if (/popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(code)) return;
      say(/network/.test(code) || !A ? "Serve la connessione a internet per accedere. Riprova quando sei online."
        : /unauthorized-domain/.test(code) ? "Questo indirizzo non è autorizzato per l'accesso (impostazioni di Firebase)."
        : "Accesso non riuscito. Riprova tra poco.");
    }
  }
  async function signOutNow() {
    try { await pushDirty(); await pushUnlinkUser(lsGet(PUSH_TOKEN, null)).catch(() => {}); const A = fbNow || await fbAuth(); await A.au.signOut(A.auth); } catch (e) {}
    onUser(null);
  }

  const initialOf = u => esc(((u && (u.displayName || u.email)) || "?").trim().charAt(0).toUpperCase());
  const photoOf = u => {
    const candidates = [u && u.photoURL];
    if (u && Array.isArray(u.providerData)) {
      u.providerData.forEach(p => { if (p && p.providerId === "google.com") candidates.push(p.photoURL); });
    }
    for (const value of candidates) {
      try {
        const photo = new URL(value);
        if (photo.protocol === "https:") return photo.href;
      } catch (e) {}
    }
    return "";
  };
  const avatarOf = (u, small = false) => {
    const photo = photoOf(u);
    return `<span class="ua-avatar${small ? " ua-avatar-sm" : ""}" aria-hidden="true"${photo ? ' style="position:relative;overflow:hidden"' : ""}>${initialOf(u)}${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit">` : ""}</span>`;
  };
  function installAvatarFallbacks(root = document) {
    root.querySelectorAll(".ua-avatar img").forEach(img => img.addEventListener("error", () => img.remove(), { once: true }));
  }
  function paintAccount() {
    document.querySelectorAll(".ua-open-sync").forEach(b => {
      if (cloudUser) {
        const who = cloudUser.displayName || cloudUser.email || "account Google";
        b.innerHTML = avatarOf(cloudUser, true);
        installAvatarFallbacks(b);
        b.setAttribute("aria-label", `I tuoi progressi: accesso fatto come ${who}, spunte sincronizzate`);
        b.title = `Accesso fatto come ${who}`;
      } else {
        b.innerHTML = ICON.user;
        b.setAttribute("aria-label", "Accedi: salva i tuoi progressi su tutti i dispositivi");
        b.title = "Accedi per salvare i progressi";
      }
    });
  }

  /* scheda "I tuoi progressi": tendina come quella delle News
     (sotto il pulsante su PC, dal basso su telefono) */
  let ap = null, apTrigger = null;
  function buildAccountPanel() {
    ap = el("div", { class: "ua-np ua-ap", role: "dialog", "aria-modal": "false", "aria-label": "I tuoi progressi", hidden: "" });
    ap.innerHTML = `<div class="ua-np-veil"></div><div class="ua-np-box" tabindex="-1"><span class="ua-np-grip" aria-hidden="true"></span><div class="ua-np-in"></div></div>`;
    document.body.append(ap);
    ap.querySelector(".ua-np-veil").addEventListener("click", () => closeAccount());
    ap.addEventListener("click", e => { if (e.target.closest(".ua-np-close")) closeAccount(); });
    sheetSwipe(ap.querySelector(".ua-np-box"), () => closeAccount());
  }
  function renderAccount() {
    const u = cloudUser;
    const item = (cls, ic, t, x, href) => {
      const inner = `<span class="ua-nt-ic">${ic}</span><span class="ua-nt-txt"><b>${t}</b><span>${x}</span></span>`;
      return `<li>${href ? `<a class="ua-ap-item ${cls}" href="${href}">${inner}</a>` : `<button type="button" class="ua-ap-item ${cls}">${inner}</button>`}</li>`;
    };
    const top = u
      ? `<div class="ua-acct-box">${avatarOf(u)}
          <div class="ua-acct-who"><b>${esc(u.displayName || "Account Google")}</b><span>${esc(u.email || "")}</span></div></div>
        <p class="ua-ap-p"><span class="ua-acct-ok">Sincronizzate ✓</span> Spunte del piano di studio, dei quaderni e risultati dei quiz si aggiornano da sole su ogni dispositivo dove accedi.</p>`
      : `<p class="ua-ap-p">Accedi con Google per ritrovare <b>le stesse spunte su PC e telefono</b>, sempre aggiornate. Ognuno vede solo le proprie.</p>
        <button type="button" class="ua-btn ua-btn-solid ua-btn-wide ua-do-login">Accedi con Google</button>
        <p class="ua-ap-p ua-acct-err" role="alert" hidden></p>
        <p class="ua-ap-note">Le spunte già presenti qui vengono unite a quelle del tuo account.</p>`;
    ap.querySelector(".ua-np-in").innerHTML = `
      <div class="ua-np-head"><h2>I tuoi progressi</h2><button type="button" class="ua-np-close" aria-label="Chiudi">×</button></div>
      <div class="ua-ap-body">${top}</div>
      <ul class="ua-ap-menu">
        <li class="ua-ap-exp"><button type="button" class="ua-ap-item ua-do-export" aria-expanded="false" aria-controls="ua-ap-move"><span class="ua-nt-ic">${ICON.sync}</span><span class="ua-nt-txt"><b>Sposta le spunte</b><span>${u ? "Con un link o un QR" : "Senza account, con un link o un QR"}</span></span>${ICON.chev}</button>
          <div class="ua-ap-move" id="ua-ap-move" hidden></div></li>
        ${u ? item("ua-ap-switch ua-do-switch", ICON.swap, "Accedi con un altro account", "Scegli un altro account Google") : ""}
        ${item("ua-ap-report", ICON.bug, "Segnala un problema", "Qualcosa non va negli appunti o nel sito?", `${ROOT}segnalazioni.html`)}
      </ul>
      ${u ? `<button type="button" class="ua-np-all ua-do-logout">${ICON.logout}<span>Esci</span></button>` : ""}`;
    installAvatarFallbacks(ap);
    const login = ap.querySelector(".ua-do-login");
    if (login) login.addEventListener("click", () => signIn(login, ap.querySelector(".ua-acct-err")));
    const sw = ap.querySelector(".ua-do-switch");
    if (sw) {
      const swErr = el("p", { class: "ua-ap-p ua-acct-err", role: "alert", hidden: "" });
      sw.closest("li").append(swErr);
      sw.addEventListener("click", () => switchAccount(sw, swErr));
    }
    const out = ap.querySelector(".ua-do-logout");
    if (out) out.addEventListener("click", () => { out.disabled = true; signOutNow(); });
    const exp = ap.querySelector(".ua-do-export"), move = ap.querySelector(".ua-ap-move");
    exp.addEventListener("click", () => {
      const open = exp.getAttribute("aria-expanded") !== "true";
      exp.setAttribute("aria-expanded", String(open));
      move.hidden = !open;
      if (open) { fillExport(move); if (!phone()) placeBox(ap.querySelector(".ua-np-box"), apTrigger); move.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    });
  }
  function openAccount(trigger) {
    if (!cloudUser) fbAuth().catch(() => {}); // la libreria arriva mentre leggi: il tocco su "Accedi" apre subito Google
    if (!ap) buildAccountPanel();
    if (pal && !pal.hidden) closeSearch();
    closeNewsPanel(true);
    apTrigger = trigger || document.querySelector(".ua-open-sync");
    renderAccount(); ap.hidden = false; placeBox(ap.querySelector(".ua-np-box"), apTrigger);
    document.querySelectorAll(".ua-open-sync").forEach(b => b.setAttribute("aria-expanded", "true"));
    ap.querySelector(".ua-np-box").focus({ preventScroll: true });
  }
  function closeAccount(noFocus) {
    if (!ap || ap.hidden) return;
    ap.hidden = true;
    document.querySelectorAll(".ua-open-sync").forEach(b => b.setAttribute("aria-expanded", "false"));
    if (!noFocus && apTrigger && document.contains(apTrigger)) apTrigger.focus({ preventScroll: true });
  }
  document.addEventListener("click", e => {
    if (ap && !ap.hidden && !phone() && !e.target.closest(".ua-np-box, .ua-open-sync")) closeAccount(true);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && ap && !ap.hidden) { e.preventDefault(); closeAccount(); } });
  window.addEventListener("resize", () => { if (ap && !ap.hidden) placeBox(ap.querySelector(".ua-np-box"), apTrigger); });
  window.addEventListener("scroll", () => { if (ap && !ap.hidden && !phone()) closeAccount(true); }, { passive: true });

  /* avviso breve in basso */
  let toastEl = null, toastTimer = null;
  function toast(msg, action, onAction) {
    if (!toastEl) { toastEl = el("div", { class: "ua-toast", role: "status" }); document.body.append(toastEl); }
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="ua-toast-act">${esc(action)}</button>` : ""}<button type="button" class="ua-toast-x" aria-label="Chiudi">×</button>`;
    const hide = () => { toastEl.classList.remove("is-on"); };
    toastEl.querySelector(".ua-toast-x").addEventListener("click", hide);
    if (action) toastEl.querySelector(".ua-toast-act").addEventListener("click", () => { hide(); onAction(); });
    requestAnimationFrame(() => toastEl.classList.add("is-on"));
    clearTimeout(toastTimer);
    if (!action) toastTimer = setTimeout(hide, 5000);
  }

  function startCloud() {
    watchStorage();
    if (cloudOn()) fbAuth().catch(() => {});
    let msg = null;
    try { msg = sessionStorage.getItem(CLOUD_MSG); sessionStorage.removeItem(CLOUD_MSG); } catch (e) {}
    if (msg) setTimeout(() => toast(msg), 400);
  }

  /* ---------------- "riprendi da dove eri" ----------------
     Sulle pagine di appunti ricorda l'ultimo capitolo che stavi leggendo. La home lo mostra. */
  const LAST_KEY = "ua-last";
  /* Oltre al capitolo si ricorda il punto preciso: il blocco (paragrafo, titolo, voce di elenco…) in cima
     allo schermo, come posizione tra i blocchi del capitolo (b) con l'inizio del suo testo (x) per riconoscerlo,
     e quanto del capitolo avevi già letto (f, da 0 a 1) come riserva. Il link "Riprendi" della home porta
     ?riprendi=1#capitolo e qui si torna a quel blocco. */
  const LAST_BLOCKS = "h2, h3, h4, p, li, pre, table, figure, blockquote, .def, .note, .vs, .levels, dt, dd";
  const READ_LINE = () => Math.max(70, innerHeight * 0.15); // poco sotto la barra in alto
  const blocksOf = sec => [...sec.querySelectorAll(LAST_BLOCKS)].filter(b => !b.parentElement.closest(LAST_BLOCKS) && b.offsetHeight > 0);
  const startText = b => (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
  function readingPoint(sec) {
    const line = READ_LINE(), r = sec.getBoundingClientRect();
    const out = { f: Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height))) };
    const bl = blocksOf(sec);
    for (let k = 0; k < bl.length; k++) if (bl[k].getBoundingClientRect().bottom > line) { out.b = k; out.x = startText(bl[k]); break; }
    return out;
  }
  function restoreReading(prev) {
    const qs = new URLSearchParams(location.search);
    if (!qs.has("riprendi")) return;
    try { qs.delete("riprendi"); history.replaceState(history.state, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); } catch (e) {}
    if (!prev || prev.p !== PAGE || !prev.i) return;
    const sec = document.getElementById(prev.i);
    if (!sec) return;
    const target = () => {
      const bl = blocksOf(sec);
      let b = typeof prev.b === "number" ? bl[prev.b] : null;
      if (prev.x && (!b || startText(b) !== prev.x)) b = bl.find(x => startText(x) === prev.x) || b; // il capitolo è cambiato: cerco il testo
      if (b) return b.getBoundingClientRect().top + scrollY - READ_LINE() + 8;
      const r = sec.getBoundingClientRect();
      return r.top + scrollY + (prev.f || 0) * r.height - READ_LINE();
    };
    let moved = false;
    const place = () => { if (!moved) window.scrollTo(0, Math.max(0, target())); };
    place();
    ["wheel", "touchstart", "keydown"].forEach(ev => addEventListener(ev, () => { moved = true; }, { once: true, passive: true }));
    addEventListener("load", place, { once: true });
    // immagini e caratteri finiscono di caricare dopo e spostano il testo: mi riposiziono a ogni cambio
    // di altezza della pagina, per qualche secondo o finché non scorri tu
    let ro = null;
    if ("ResizeObserver" in window) { ro = new ResizeObserver(() => place()); ro.observe(document.body); setTimeout(() => ro.disconnect(), 5000); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    setTimeout(place, 300); setTimeout(place, 1000); setTimeout(place, 2500);
    setTimeout(() => toast("Ripreso da dove eri rimasto."), 600);
  }
  function trackLast() {
    if (!here) return;
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(LAST_KEY)); } catch (e) {}
    restoreReading(prev);
    const secs = [...document.querySelectorAll("section.ch[id]")];
    const save = (sec) => {
      const v = { p: PAGE, at: Date.now() };
      if (sec) {
        v.i = sec.id; v.t = sec.dataset.t || (sec.querySelector("h2") || {}).textContent || ""; const n = sec.querySelector(".ch-num"); if (n) v.n = n.textContent.trim();
        Object.assign(v, readingPoint(sec));
      }
      try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch (e) {}
    };
    if (!secs.length) { save(null); return; }
    // il capitolo in lettura è quello che attraversa la linea di lettura
    const current = () => { const line = READ_LINE(); return secs.find(s => { const r = s.getBoundingClientRect(); return r.top <= line && r.bottom > line; }) || null; };
    let timer = null, started = false;
    const onScroll = () => {
      if (timer) return; // al massimo un salvataggio al secondo
      timer = setTimeout(() => { timer = null; const c = current(); if (c) save(c); }, 1000);
    };
    // si comincia a salvare solo dopo che hai scorso tu (così aprire la pagina non cancella il punto di prima)
    ["wheel", "touchmove", "keydown", "pointerdown"].forEach(ev => addEventListener(ev, () => { started = true; }, { passive: true }));
    addEventListener("scroll", () => { if (started) onScroll(); }, { passive: true });
    window.addEventListener("pagehide", () => { if (!started) return; const c = current(); if (c) save(c); });
    if (!prev || prev.p !== PAGE) save(null); // pagina nuova: la home la mostra subito, il punto arriva scorrendo
  }

  /* ---------------- news e notifiche ----------------
     Le notizie stanno in news.json (nella cartella Unisa). Per pubblicarne una basta aggiungerla in cima alla lista.
     - il campanello (barra in alto, e pulsanti in basso sulle pagine di appunti) apre una tendina con le ultime notizie
       e l'interruttore delle notifiche; su telefono la tendina sale dal basso
     - "Tutte le notizie" porta alla pagina news.html, con l'elenco completo
     - con le notifiche attive, ogni notizia nuova arriva come notifica del sistema quando apri il sito
       (e, se il sito è installato come app su Android/PC, anche controllando in sottofondo) */
  const NEWS_SEEN = "news-lette", NEWS_ON = "news-notifiche";
  const NEWS_STATE = "ua-news-stato", NEWS_STATE_URL = ROOT + "__news-notificate";
  const NEWS_PAGE = ROOT + "news.html";
  const IS_NEWS_PAGE = PAGE === "news.html";
  const PANEL_MAX = 4;
  let news = [], newsLoaded = false, np = null, npTrigger = null, npFresh = new Set();
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const notifSupported = () => "Notification" in window && "serviceWorker" in navigator;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const phone = () => matchMedia("(max-width: 640px)").matches;
  const fmtDay = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return d; } };
  const newsImg = n => n.immagine ? (/^https:/.test(n.immagine) ? n.immagine : ROOT + enc(n.immagine)) : "";
  const newsHref = n => n.link ? (/^https?:/.test(n.link) ? n.link : ROOT + enc(n.link)) : NEWS_PAGE + "#" + encodeURIComponent(n.id);

  // quali notizie sono già state notificate: in una cache, così lo vedono sia la pagina sia il service worker
  async function notifiedGet() { try { const r = await (await caches.open(NEWS_STATE)).match(NEWS_STATE_URL); return r ? await r.json() : null; } catch (e) { return null; } }
  async function notifiedSet(ids) { try { await (await caches.open(NEWS_STATE)).put(NEWS_STATE_URL, new Response(JSON.stringify(ids), { headers: { "Content-Type": "application/json" } })); } catch (e) {} }

  async function loadNews() {
    try {
      const r = await fetch(ROOT + "news.json", { cache: "no-cache" });
      const d = await r.json();
      news = (Array.isArray(d.news) ? d.news : []).filter(n => n && n.id && n.titolo);
    } catch (e) { news = []; }
    newsLoaded = true;
    paintNewsDot();
    if (np && !np.hidden) { npFresh = new Set(unread().map(n => n.id)); renderPanel(); markRead(); }
    renderNewsPage();
    notifyNew();
  }
  function unread() { const seen = new Set(lsGet(NEWS_SEEN, [])); return news.filter(n => !seen.has(n.id)); }
  function paintNewsDot() {
    const k = unread().length;
    document.querySelectorAll(".ua-news-btn").forEach(b => {
      const dot = b.querySelector(".ua-news-dot"); if (dot) dot.hidden = !k;
      const l = k ? `News, ${k} ${k === 1 ? "notizia" : "notizie"} da leggere` : "News";
      b.setAttribute("aria-label", l); b.title = l;
    });
  }
  function markRead() { lsSet(NEWS_SEEN, news.map(n => n.id)); paintNewsDot(); }

  async function notifyNew() {
    if (!notifSupported() || Notification.permission !== "granted" || !lsGet(NEWS_ON, false) || !news.length) return;
    const done = await notifiedGet();
    if (done === null) { await notifiedSet(news.map(n => n.id)); return; } // prima volta: niente raffica di notizie vecchie
    const fresh = news.filter(n => !done.includes(n.id) && !lsGet(NEWS_SEEN, []).includes(n.id));
    if (!fresh.length) return;
    await notifiedSet(done.concat(fresh.map(n => n.id)));
    const reg = await navigator.serviceWorker.getRegistration(ROOT).catch(() => null);
    for (const n of fresh.slice(0, 3)) {
      const opt = { body: n.testo || "", tag: "news-" + n.id, icon: ROOT + "icon-192.png", badge: ROOT + "favicon-32.png", data: { url: NEWS_PAGE + "#" + encodeURIComponent(n.id) } };
      try { if (reg) await reg.showNotification(n.titolo, opt); else new Notification(n.titolo, opt); } catch (e) {}
    }
  }

  async function enableNotifications() {
    let p = Notification.permission;
    if (p === "default") { try { p = await Notification.requestPermission(); } catch (e) {} } // va chiesto subito dopo il tocco (Safari)
    if (p === "granted") {
      lsSet(NEWS_ON, true);
      await notifiedSet(news.map(n => n.id)); // da adesso in poi: le notizie già uscite non arrivano come notifica
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg.periodicSync) await reg.periodicSync.register("news", { minInterval: 6 * 60 * 60 * 1000 });
      } catch (e) {}
      try { const reg = await navigator.serviceWorker.getRegistration(ROOT); if (reg) reg.showNotification("Notifiche attive", { body: "Ti avviseremo appena arriva una notizia nuova, anche a sito chiuso.", tag: "news-on", icon: ROOT + "icon-192.png" }); } catch (e) {}
      pushSubscribe().catch(() => {}); // notifiche istantanee (Firebase Cloud Messaging)
    }
    refreshNotifControls();
  }
  async function disableNotifications() {
    lsSet(NEWS_ON, false);
    try { const reg = await navigator.serviceWorker.ready; if (reg.periodicSync) await reg.periodicSync.unregister("news"); } catch (e) {}
    refreshNotifControls();
    pushUnsubscribe();
  }

  /* notifiche istantanee: il dispositivo riceve un codice da Firebase Cloud Messaging e lo registra
     in Firestore (notifiche/<codice>). Quando esce una notizia, l'azione di GitHub la manda a tutti i codici. */
  const PUSH_TOKEN = "news-token", PUSH_AT = "news-token-at", WEEK = 7 * 24 * 3600 * 1000;
  const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, ko) => setTimeout(() => ko(new Error("sw")), 15000))]);
  async function pushSubscribe() {
    const c = await fbLoad();
    const m = await import(FB_URL("messaging"));
    if (!(await m.isSupported())) return false;
    const reg = await swReady();
    const token = await m.getToken(m.getMessaging(c.app), { vapidKey: FB_VAPID, serviceWorkerRegistration: reg });
    if (!token) return false;
    const old = lsGet(PUSH_TOKEN, null);
    await c.fs.setDoc(c.fs.doc(c.db, "notifiche", token), { token, aggiornato: c.fs.serverTimestamp() });
    if (old && old !== token) c.fs.deleteDoc(c.fs.doc(c.db, "notifiche", old)).catch(() => {});
    lsSet(PUSH_TOKEN, token); lsSet(PUSH_AT, Date.now());
    if (old && old !== token) pushUnlinkUser(old).catch(() => {});
    pushLinkUser().catch(() => {});
    return true;
  }

  /* notifiche personali (segnalazioni): con l'accesso fatto, il codice del dispositivo si salva anche nel
     documento dell'account (utenti/<id>, campo "dispositivi"). Così l'azione di GitHub che controlla le
     segnalazioni sa a quali dispositivi mandare "stato aggiornato" o, all'amministratore, "nuova segnalazione". */
  const PUSH_LINK = "news-token-account";
  async function pushLinkUser() {
    const token = lsGet(PUSH_TOKEN, null), u = cloudUser;
    if (!token || !u || !lsGet(NEWS_ON, false)) return;
    const mark = u.uid + "|" + token;
    if (lsGet(PUSH_LINK, "") === mark) return; // già collegato: niente scritture a ogni pagina
    const c = await fbLoad();
    await c.fs.setDoc(c.fs.doc(c.db, "utenti", u.uid), { dispositivi: { [token]: c.fs.serverTimestamp() } }, { merge: true });
    lsSet(PUSH_LINK, mark);
  }
  async function pushUnlinkUser(token) {
    const u = cloudUser;
    try { localStorage.removeItem(PUSH_LINK); } catch (e) {}
    if (!token || !u) return;
    const c = await fbLoad();
    await c.fs.setDoc(c.fs.doc(c.db, "utenti", u.uid), { dispositivi: { [token]: c.fs.deleteField() } }, { merge: true });
  }
  async function pushUnsubscribe() {
    const old = lsGet(PUSH_TOKEN, null);
    try { localStorage.removeItem(PUSH_TOKEN); localStorage.removeItem(PUSH_AT); } catch (e) {}
    if (!old) return;
    await pushUnlinkUser(old).catch(() => {});
    try {
      const c = await fbLoad();
      const m = await import(FB_URL("messaging"));
      await c.fs.deleteDoc(c.fs.doc(c.db, "notifiche", old));
      if (await m.isSupported()) await m.deleteToken(m.getMessaging(c.app));
    } catch (e) {}
  }
  // il codice può cambiare o scadere: lo rinnovo una volta a settimana (o se manca)
  function pushRefresh() {
    if (!notifSupported() || Notification.permission !== "granted" || !lsGet(NEWS_ON, false)) return;
    if (lsGet(PUSH_TOKEN, null) && Date.now() - lsGet(PUSH_AT, 0) < WEEK) return;
    setTimeout(() => pushSubscribe().catch(() => {}), 3000);
  }

  // interruttore delle notifiche, o una spiegazione se su questo dispositivo non si può
  function notifControl() {
    const head = `<span class="ua-nt-ic ua-nt-bell">${ICON.bell}</span>`;
    if (!notifSupported()) {
      const why = isIOS && !standalone()
        ? `Su iPhone e iPad: tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>, apri il sito dall'icona e attivale da qui.`
        : `Questo browser non supporta le notifiche. Prova con Chrome, Edge, Safari o Firefox aggiornati.`;
      return `<div class="ua-nt">${head}<div class="ua-nt-txt"><b>Notifiche</b><span>${why}</span></div></div>`;
    }
    if (Notification.permission === "denied") {
      return `<div class="ua-nt">${head}<div class="ua-nt-txt"><b>Notifiche bloccate</b><span>Le hai bloccate per questo sito: riattivale dalle impostazioni del browser, poi torna qui.</span></div></div>`;
    }
    const on = Notification.permission === "granted" && lsGet(NEWS_ON, false);
    return `<div class="ua-nt">${head}<div class="ua-nt-txt"><b>Notifiche</b><span>${on ? "Ti avvisiamo per le notizie nuove e, con l'accesso fatto, per le tue segnalazioni." : "Ricevi un avviso per le notizie nuove e, con l'accesso fatto, per le tue segnalazioni."}</span></div>
      <button type="button" class="ua-switch" role="switch" aria-checked="${on}" aria-label="Notifiche delle news" data-news-switch><i></i></button></div>`;
  }
  function refreshNotifControls() {
    document.querySelectorAll("[data-ua-nt]").forEach(box => { box.innerHTML = notifControl(); });
  }
  document.addEventListener("click", e => {
    const s = e.target.closest && e.target.closest("[data-news-switch]");
    if (!s) return;
    s.getAttribute("aria-checked") === "true" ? disableNotifications() : enableNotifications();
  });

  function newsItem(n, full) {
    const c = CORSI.find(x => x.code === n.corso);
    const tag = c ? `<span class="ua-ni-tag" style="--c:var(--ua-c-${esc(c.color)})">${esc(c.code)}</span>` : "";
    const fresh = npFresh.has(n.id) ? `<span class="ua-ni-new">nuova</span>` : "";
    const meta = `<span class="ua-ni-meta">${tag}<time datetime="${esc(n.data || "")}">${esc(fmtDay(n.data || ""))}</time>${fresh}</span>`;
    if (full) {
      const link = n.link ? `<a class="ua-ni-link" href="${esc(newsHref(n))}">Apri →</a>` : "";
      const img = n.immagine ? `<img class="ua-ni-img" src="${esc(newsImg(n))}" alt="" loading="lazy" decoding="async">` : "";
      return `<li class="ua-ni${npFresh.has(n.id) ? " is-new" : ""}" id="${esc(n.id)}">${meta}<p class="ua-ni-t">${esc(n.titolo)}</p>${n.testo ? `<p class="ua-ni-x">${esc(n.testo)}</p>` : ""}${img}${link}</li>`;
    }
    const thumb = n.immagine ? `<img class="ua-ni-thumb" src="${esc(newsImg(n))}" alt="" loading="lazy" decoding="async">` : "";
    return `<li><a class="ua-ni${npFresh.has(n.id) ? " is-new" : ""}${thumb ? " has-thumb" : ""}" href="${esc(newsHref(n))}"><span class="ua-ni-main">${meta}<span class="ua-ni-t">${esc(n.titolo)}</span>${n.testo ? `<span class="ua-ni-x">${esc(n.testo)}</span>` : ""}</span>${thumb}</a></li>`;
  }
  const emptyNews = `<div class="ua-ni-empty">${ICON.bell}<p><b>Qui arriveranno le notizie.</b> Nuovi appunti, quiz, cambi di programma e avvisi sui corsi.</p></div>`;

  /* tendina */
  function buildNewsPanel() {
    np = el("div", { class: "ua-np", role: "dialog", "aria-modal": "false", "aria-label": "News", hidden: "" });
    np.innerHTML = `<div class="ua-np-veil"></div><div class="ua-np-box" tabindex="-1"><span class="ua-np-grip" aria-hidden="true"></span><div class="ua-np-in"></div></div>`;
    document.body.append(np);
    np.querySelector(".ua-np-veil").addEventListener("click", closeNewsPanel);
    np.addEventListener("click", e => { if (e.target.closest(".ua-np-close")) closeNewsPanel(); });
    sheetSwipe(np.querySelector(".ua-np-box"), () => closeNewsPanel());
  }
  function renderPanel() {
    const list = news.slice(0, PANEL_MAX);
    const more = news.length > PANEL_MAX ? `Tutte le notizie (${news.length}) →` : "Tutte le notizie →";
    np.querySelector(".ua-np-in").innerHTML = `
      <div class="ua-np-head"><h2>News</h2><button type="button" class="ua-np-close" aria-label="Chiudi">×</button></div>
      <div class="ua-np-body">${!newsLoaded ? `<p class="ua-ni-wait">Carico…</p>` : list.length ? `<ul class="ua-ni-list">${list.map(n => newsItem(n, false)).join("")}</ul>` : emptyNews}</div>
      <div class="ua-np-nt" data-ua-nt>${notifControl()}</div>
      <a class="ua-np-all" href="${NEWS_PAGE}">${more}</a>`;
  }
  // su telefono: trascina in giù la maniglia per chiudere
  function sheetSwipe(box, close) {
    let y0 = null;
    box.addEventListener("touchstart", e => { if (phone() && (e.target.closest(".ua-np-grip,.ua-np-head") || box.scrollTop <= 0)) y0 = e.touches[0].clientY; }, { passive: true });
    box.addEventListener("touchmove", e => { if (y0 === null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) box.style.transform = `translateY(${dy}px)`; }, { passive: true });
    box.addEventListener("touchend", e => { if (y0 === null) return; const dy = (e.changedTouches[0].clientY - y0); y0 = null; box.style.transform = ""; if (dy > 90) close(); });
  }
  // su PC: la tendina si apre sotto (o sopra) il pulsante che l'ha aperta
  function placeBox(box, trigger) {
    box.style.top = box.style.bottom = box.style.right = box.style.left = "";
    if (phone() || !trigger) return; // su telefono il CSS lo mette in basso, a tutta larghezza
    const r = trigger.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight;
    box.style.right = Math.max(12, vw - r.right) + "px";
    if (r.top < vh / 2) box.style.top = (r.bottom + 8) + "px";
    else box.style.bottom = (vh - r.top + 8) + "px";
  }
  const placePanel = () => placeBox(np.querySelector(".ua-np-box"), npTrigger);
  function openNewsPanel(trigger) {
    if (!np) buildNewsPanel();
    if (pal && !pal.hidden) closeSearch();
    closeAccount(true);
    npTrigger = trigger;
    npFresh = new Set(unread().map(n => n.id));
    renderPanel(); np.hidden = false; placePanel();
    document.querySelectorAll(".ua-news-btn").forEach(b => b.setAttribute("aria-expanded", "true"));
    np.querySelector(".ua-np-box").focus({ preventScroll: true });
    if (newsLoaded) markRead(); // aperta la tendina, le notizie contano come lette (l'etichetta "nuova" resta finché è aperta)
  }
  function closeNewsPanel(noFocus) {
    if (!np || np.hidden) return;
    np.hidden = true;
    document.querySelectorAll(".ua-news-btn").forEach(b => b.setAttribute("aria-expanded", "false"));
    if (!noFocus && npTrigger && document.contains(npTrigger)) npTrigger.focus({ preventScroll: true });
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".ua-news-btn");
    if (b) { e.preventDefault(); (np && !np.hidden && npTrigger === b) ? closeNewsPanel() : openNewsPanel(b); return; }
    if (np && !np.hidden && !e.target.closest(".ua-np-box") && !phone()) closeNewsPanel();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && np && !np.hidden) { e.preventDefault(); closeNewsPanel(); } });
  window.addEventListener("resize", () => { if (np && !np.hidden) placePanel(); });
  window.addEventListener("scroll", () => { if (np && !np.hidden && !phone()) closeNewsPanel(); }, { passive: true });

  /* pagina news.html: elenco completo */
  function renderNewsPage() {
    const box = document.getElementById("ua-news-page");
    if (!box) return;
    npFresh = new Set(unread().map(n => n.id));
    box.innerHTML = `<div class="ua-np-nt ua-np-nt-card" data-ua-nt>${notifControl()}</div>
      ${news.length ? `<ul class="ua-ni-list ua-ni-full">${news.map(n => newsItem(n, true)).join("")}</ul>` : emptyNews}`;
    if (location.hash) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView({ block: "center" }); }
    markRead();
  }

  /* ---------------- uso offline (app installabile) ---------------- */
  function registerSW() {
    if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || location.hostname === "localhost")) return;
    window.addEventListener("load", () => navigator.serviceWorker.register(ROOT + "sw.js").catch(() => {}));
  }

  /* ---------------- effetti della home ---------------- */
  function homeEffects() {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      document.querySelectorAll("[data-ua-rise]").forEach((e, i) => {
        e.style.animation = `ua-rise .6s var(--ua-ease) ${80 + i * 70}ms both`;
      });
      document.querySelectorAll("[data-ua-count]").forEach(e => {
        const to = +e.dataset.uaCount, t0 = performance.now(), dur = 700;
        const step = now => { const k = Math.min(1, (now - t0) / dur); e.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }
    document.addEventListener("pointermove", e => {
      const card = e.target.closest && e.target.closest(".docs");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------------- dal quiz al punto giusto del quaderno ----------------
     I link "nel quaderno" dei quiz hanno la forma
       Quaderno.html?trova=<domanda>&risp=<risposta giusta>&perche=<spiegazione>&da=quiz#<capitolo>
     Dentro il capitolo si cerca il blocco (paragrafo, voce di elenco, riga di tabella, riquadro…) che ha più parole
     in comune con domanda, risposta e spiegazione (le parole rare nel capitolo contano di più), lo si porta al centro
     dello schermo e lo si evidenzia. Se qualcosa non torna resta il salto al capitolo, come prima. */
  const STOPWORDS = new Set(("il lo la i gli le un una uno del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle " +
    "nel nello nella nei negli nelle sul sullo sulla sui sugli sulle di da in con su per tra fra a e o ed od ma se non che chi cui come cosa quale quali " +
    "quanto quanti quando dove perche è sono essere ha hanno ho fa fanno puo possono deve devono viene vengono si ne ci vi mi ti sempre solo anche piu meno " +
    "molto tutto tutti tutte ogni questo questa questi queste quello quella quelli quelle suo sua suoi sue loro altro altra altri altre stesso stessa " +
    "cioe ossia oppure invece mentre prima dopo poi gia ancora niente nessuno qualcosa indica significa serve servono vero falso giusta giusto " +
    "the and for with").split(" "));
  const stem = t => (t.length > 5 ? t.slice(0, 5) : t);
  const words = s => (norm(s).match(/[a-z0-9]+/g) || []).filter(t => (t.length > 2 || /\d/.test(t)) && !STOPWORDS.has(t)).map(stem);

  function findPassage(sec, query) {
    const SEL = "p, li, tr, dt, dd, pre, figcaption, blockquote, summary, h3, h4, .def, .note, .exam, .levels > div, .vs > div, .flow > *, " +
      "div:not(:has(div, p, ul, ol, table, pre, h3, h4))"; // più le "schede" fatte solo di testo (es. la linea del tempo delle versioni)
    let blocks = [...sec.querySelectorAll(SEL)].filter(b => !b.closest(".ch-head"));
    blocks = blocks.filter(b => !blocks.some(o => o !== b && b.contains(o) && o.textContent.trim().length > 20)); // solo i più interni
    if (!blocks.length) return null;
    // titolo (h3/h4) più vicino sopra ogni blocco: dà un po' di contesto
    const heads = [...sec.querySelectorAll("h3, h4")];
    const headOf = b => { let h = null; for (const x of heads) { if (x === b) break; if (x.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) h = x; } return h; };
    const info = blocks.map(b => ({ b, set: new Set(words(b.textContent)), text: norm(b.textContent).replace(/\s+/g, " ") }));
    const df = new Map();
    info.forEach(x => x.set.forEach(t => df.set(t, (df.get(t) || 0) + 1)));
    const N = info.length, idf = t => Math.log(1 + N / (df.get(t) || 0.5));
    const want = new Map();
    query.forEach(([s, w]) => words(s).forEach(t => want.set(t, Math.max(want.get(t) || 0, w))));
    const score = set => { let v = 0; want.forEach((w, t) => { if (set.has(t)) v += w * idf(t); }); return v; };
    const phrase = norm(query[1][0]).replace(/\s+/g, " ").trim();
    let best = null;
    info.forEach(x => {
      let v = score(x.set);
      if (!v) return;
      const h = headOf(x.b);
      if (h && h !== x.b) v += 0.3 * score(new Set(words(h.textContent)));
      if (phrase.length > 3 && phrase.length < 60 && x.text.includes(phrase)) v += 4;
      v /= 1 + 0.12 * Math.log(1 + x.set.size / 10); // i blocchi lunghi non vincono solo perché lunghi
      if (x.b.closest(".quiz")) v *= 0.45;            // meglio la spiegazione che le "domande lampo"
      if (!best || v > best.v) best = { b: x.b, v };
    });
    return best && best.v > 1.5 ? best.b : null;
  }

  function quizTarget() {
    const qs = new URLSearchParams(location.search);
    const q = qs.get("trova");
    if (q === null || !location.hash) return;
    const sec = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!sec) return;
    let hit = null;
    try { hit = findPassage(sec, [[q, 1], [qs.get("risp") || "", 1.6], [qs.get("perche") || "", 0.8]]); } catch (e) {}
    const target = hit || sec;
    const hits = [];
    if (hit) {
      const d = hit.closest("details"); if (d) d.open = true;
      hits.push(hit.tagName === "TR" ? hit : hit.closest(".levels > div, .vs > div") || hit);
      // "…tre proprietà:" seguito dall'elenco: evidenzia anche l'elenco
      const next = hit.nextElementSibling;
      if (/^(P|H3|H4)$/.test(hit.tagName) && next && /:\s*$/.test(hit.textContent) && /^(UL|OL|DIV|TABLE|DL)$/.test(next.tagName)) hits.push(next);
      hits.forEach(h => h.classList.add("ua-spot"));
    }
    let userMoved = false;
    // scorre solo questa pagina (scrollIntoView, dentro il pannello del quiz, sposterebbe anche il quiz sotto)
    const place = () => {
      if (userMoved) return;
      const r = (hits[0] || target).getBoundingClientRect(), last = hits.length ? hits[hits.length - 1].getBoundingClientRect() : r;
      const h = last.bottom - r.top, gap = hit && h < innerHeight - 140 ? (innerHeight - h) / 2 : 80;
      window.scrollTo(0, Math.max(0, r.top + scrollY - gap));
    };
    place();
    ["wheel", "touchstart", "keydown"].forEach(ev => addEventListener(ev, () => { userMoved = true; }, { once: true, passive: true }));
    // le immagini caricano dopo e spostano la pagina: si riposiziona finché l'utente non scorre da solo
    addEventListener("load", place, { once: true });
    setTimeout(place, 400); setTimeout(place, 1200);
    setTimeout(() => hits.forEach(h => h.classList.add("ua-spot-fade")), 6000);
    const fromQuiz = qs.get("da") === "quiz";
    if (EMBED) return; // nel pannello del quiz basta l'evidenziazione: per tornare c'è la × del pannello
    const msg = hit ? "Ecco il punto da ripassare." : "Non ho trovato il punto preciso: ecco l'inizio del capitolo.";
    // il quaderno si apre nella stessa scheda (anche nella web app): "Torna al quiz" torna indietro,
    // e il quiz si ritrova com'era (domanda o risultato con gli errori)
    if (fromQuiz) toast(msg, "Torna al quiz", () => {
      if (history.length > 1) history.back();
      else if (document.referrer) location.href = document.referrer;
    });
    else toast(msg);
  }


  /* ---------------- pannello "Rivedi questo punto nel quaderno" (pagine dei quiz) ----------------
     Il link si apre in un pannello sopra il quiz, nella stessa pagina: funziona uguale nel browser e nella
     web app installata (Mac, iPhone, Android), dove una nuova scheda farebbe uscire dall'app.
     Chiudendo il pannello (×, Esc, clic fuori, tasto indietro) il quiz è esattamente come prima.
     Cmd/Ctrl+clic apre comunque il quaderno in una scheda a parte. */
  let qs = null;
  function closeQuizSheet(fromHistory) {
    if (!qs || qs.hidden) return;
    qs.hidden = true;
    const f = qs.querySelector("iframe"); if (f) f.remove(); // tolto l'iframe, la cronologia torna quella del quiz
    document.documentElement.classList.remove("ua-qs-open");
    if (!fromHistory && history.state && history.state.uaSheet) history.back();
    if (qs._from) try { qs._from.focus({ preventScroll: true }); } catch (e) {}
  }
  function openQuizSheet(a) {
    if (!qs) {
      qs = el("div", { class: "ua-qs", role: "dialog", "aria-modal": "true", "aria-label": "Quaderno" });
      qs.innerHTML = `<div class="ua-qs-box"><div class="ua-qs-head"><span class="ua-qs-t"></span>
        <a class="ua-qs-ext" target="_blank" rel="noopener">Apri il quaderno</a>
        <button type="button" class="ua-qs-x" aria-label="Chiudi e torna al quiz">×</button></div>
        <div class="ua-qs-body"><p class="ua-qs-load">Cerco il punto nel quaderno…</p></div></div>`;
      document.body.append(qs);
      qs.addEventListener("click", e => { if (e.target === qs) closeQuizSheet(); });
      qs.querySelector(".ua-qs-x").addEventListener("click", () => closeQuizSheet());
      // a pannello aperto i tasti del quiz (1–4, A–D, Invio) non devono rispondere o andare avanti di nascosto
      document.addEventListener("keydown", e => {
        if (qs.hidden) return;
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); closeQuizSheet(); }
      }, true);
      window.addEventListener("popstate", () => { if (!qs.hidden && !(history.state && history.state.uaSheet)) closeQuizSheet(true); });
    }
    const href = a.href, plain = href.split("?")[0] + "#" + (href.split("#")[1] || "");
    qs._from = a;
    qs.classList.remove("is-ready");
    qs.querySelector(".ua-qs-t").textContent = a.dataset.cap ? "Quaderno · cap. " + a.dataset.cap : "Quaderno";
    qs.querySelector(".ua-qs-ext").href = plain;
    qs.hidden = false;
    document.documentElement.classList.add("ua-qs-open");
    // ogni volta un iframe nuovo: riusarne uno aggiungerebbe passi alla cronologia del quiz
    const f = el("iframe", { title: "Quaderno" });
    f.addEventListener("load", () => { if (f.src) qs.classList.add("is-ready"); });
    f.src = href;
    qs.querySelector(".ua-qs-body").append(f);
    try { history.pushState(Object.assign({}, history.state || {}, { uaSheet: 1 }), ""); } catch (e) {}
    qs.querySelector(".ua-qs-x").focus({ preventScroll: true });
  }
  function quizSheetLinks() {
    document.addEventListener("click", e => {
      const a = e.target.closest && e.target.closest("a.qlink");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      openQuizSheet(a);
    });
  }

  /* ---------------- avvio ---------------- */
  if (EMBED) {
    // quaderno dentro il pannello di un quiz: solo il testo e il punto evidenziato, niente barra, pulsanti,
    // accesso, news o "riprendi da dove eri" (quelli restano alla pagina del quiz sotto)
    document.documentElement.classList.add("ua-embed");
    applyTheme(getTheme());
    quizTarget();
    window.UA = { findPassage };
    return;
  }
  buildBar();
  buildCopyright();
  if (!IS_HOME && !IS_NEWS_PAGE) buildDock();
  buildPalette();
  loadNews();
  buildSyncDialog();
  applyTheme(getTheme());
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".ua-open-search, .ua-theme, .ua-open-sync");
    if (!b) return;
    if (b.classList.contains("ua-theme")) cycleTheme();
    else if (b.classList.contains("ua-open-sync")) (ap && !ap.hidden && apTrigger === b) ? closeAccount() : openAccount(b);
    else openSearch();
  });
  paintAccount();
  startCloud();
  pushRefresh();
  refreshNotifControls();
  checkImport();
  trackLast();
  quizTarget();
  registerSW();
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openSearch() : closeSearch(); return; }
    if (IS_HOME && e.key === "/" && pal.hidden && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); openSearch(); }
  });
  if (IS_HOME) homeEffects();

  window.UA = { openSearch, closeSearch, cycleTheme, findPassage, switchAccount };
})();
