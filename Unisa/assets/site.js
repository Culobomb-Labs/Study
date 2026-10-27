/* Appunti Unisa · script comune a tutte le pagine.
   - barra in alto con percorso (home / corso / documento), ricerca e tema
   - tema chiaro / scuro / automatico, ricordato dal browser
   - ricerca nel testo di tutti gli appunti (Ctrl/Cmd + K)
   - pulsanti fluttuanti sulle pagine di appunti (home, cerca, torna su)
   - piccoli effetti sulla home
   Si carica con: <script src=".../assets/site.js" data-root="percorso/della/home/" data-page="percorso/della/pagina"></script> */
(function () {
  "use strict";

  const me = document.currentScript;
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
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    sync: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2.5" y="4" width="12" height="9" rx="1.5"/><path d="M6 17h5"/><rect x="16.5" y="8" width="5.5" height="12" rx="1.3"/><path d="M19.25 17.5h0"/></svg>',
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
    document.querySelectorAll(".ua-theme").forEach(b => { b.innerHTML = ICON[t]; b.setAttribute("aria-label", LABEL[t] + ". Clicca per cambiare"); b.title = LABEL[t]; });
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
    let crumbs = `<a class="ua-brand" href="${ROOT}index.html"><span class="ua-logo" aria-hidden="true"></span>Appunti Unisa</a>`;
    if (here) {
      crumbs += `<span class="ua-sep" aria-hidden="true">/</span><a class="ua-crumb" href="${ROOT}index.html#${esc(here.c.code.toLowerCase())}">${esc(here.c.name)}</a>`;
      crumbs += `<span class="ua-sep" aria-hidden="true">/</span><span class="ua-dot" style="--c:var(--ua-c-${esc(here.c.color)})" aria-hidden="true"></span><span class="ua-crumb ua-here" aria-current="page">${esc(here.d.name)}</span>`;
    }
    bar.innerHTML = `<div class="ua-bar-in">
      <nav class="ua-crumbs" aria-label="Percorso">${crumbs}</nav>
      <div class="ua-actions">
        <button class="ua-btn ua-open-search" type="button" aria-label="Cerca negli appunti">${ICON.search}<span class="ua-search-label">Cerca</span><span class="ua-kbd">${isMac ? "⌘" : "Ctrl"} K</span></button>
        <a class="ua-btn ua-news-btn" href="${ROOT}index.html#news" aria-label="News" title="News">${ICON.bell}<span class="ua-news-dot" hidden></span></a>
        <button class="ua-btn ua-open-sync" type="button" aria-label="Sposta i progressi su un altro dispositivo" title="Sposta i progressi su un altro dispositivo">${ICON.sync}</button>
        <button class="ua-btn ua-theme" type="button"></button>
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

  function openSearch(prefill) {
    lastFocus = document.activeElement;
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
      const s = el("script", { src: "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" });
      s.onload = () => ok(window.qrcode); s.onerror = ko; document.head.append(s);
    });
  }

  function openExport() {
    const data = collectProgress();
    const n = countChecks(data);
    const link = new URL(ROOT + "index.html", location.href).href + "#sync=" + b64(JSON.stringify(data));
    showSync(`<h2 class="ua-sync-t" id="ua-sync-t">Sposta i progressi</h2>
      <p class="ua-sync-p">${n ? `Su questo dispositivo hai <b>${n}</b> ${n === 1 ? "spunta" : "spunte"} (piano di studio e capitoli fatti).` : "Su questo dispositivo non hai ancora spunte da spostare."}
      Inquadra il codice con la fotocamera del telefono, oppure copia il link e aprilo sull'altro dispositivo.</p>
      <div class="ua-qr" aria-label="Codice QR con i tuoi progressi"><span class="ua-qr-wait">Preparo il codice…</span></div>
      <div class="ua-sync-row">
        <input class="ua-sync-link" id="ua-sync-link" readonly value="${esc(link)}" aria-label="Link con i progressi">
        <button type="button" class="ua-btn ua-sync-copy" data-focus>Copia link</button>
      </div>
      <p class="ua-sync-note">Sull'altro dispositivo le spunte vengono <b>sostituite</b> con queste. Il link contiene solo le spunte, niente dati personali.</p>
      <div class="ua-sync-actions"><button type="button" class="ua-btn" data-close>Chiudi</button></div>`);
    const copy = sync.querySelector(".ua-sync-copy"), inp = sync.querySelector(".ua-sync-link");
    copy.addEventListener("click", () => {
      const done = () => { copy.textContent = "Copiato ✓"; setTimeout(() => (copy.textContent = "Copia link"), 1800); };
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(done).catch(() => { inp.select(); try { document.execCommand("copy"); done(); } catch (e) {} });
    });
    inp.addEventListener("focus", () => inp.select());
    loadQrLib().then(qrcode => {
      const qr = qrcode(0, "L"); qr.addData(link); qr.make();
      sync.querySelector(".ua-qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }).catch(() => { sync.querySelector(".ua-qr").innerHTML = '<span class="ua-qr-wait">QR non disponibile: usa “Copia link”.</span>'; });
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
    const n = countChecks(data), here = countChecks(collectProgress());
    showSync(`<h2 class="ua-sync-t" id="ua-sync-t">Importare i progressi?</h2>
      <p class="ua-sync-p">Il link contiene <b>${n}</b> ${n === 1 ? "spunta" : "spunte"}. ${here ? `Su questo dispositivo ne hai ${here}: verranno sostituite.` : ""}</p>
      <div class="ua-sync-actions"><button type="button" class="ua-btn" data-close>Annulla</button><button type="button" class="ua-btn ua-btn-solid ua-do-import" data-focus>Importa</button></div>`);
    sync.querySelector(".ua-do-import").addEventListener("click", () => {
      try { for (const k in data) if (!SKIP_KEYS.includes(k) && typeof data[k] === "string") localStorage.setItem(k, data[k]); } catch (e) {}
      showSync(`<h2 class="ua-sync-t" id="ua-sync-t">Fatto ✓</h2><p class="ua-sync-p">Progressi importati. Apri il piano di studio o i quaderni: trovi le stesse spunte dell'altro dispositivo.</p><div class="ua-sync-actions"><button type="button" class="ua-btn ua-btn-solid" data-close data-focus>Ok</button></div>`);
    });
  }

  /* ---------------- "riprendi da dove eri" ----------------
     Sulle pagine di appunti ricorda l'ultimo capitolo che stavi leggendo. La home lo mostra. */
  const LAST_KEY = "ua-last";
  function trackLast() {
    if (!here) return;
    const save = (sec) => {
      const v = { p: PAGE, at: Date.now() };
      if (sec) { v.i = sec.id; v.t = sec.dataset.t || (sec.querySelector("h2") || {}).textContent || ""; const n = sec.querySelector(".ch-num"); if (n) v.n = n.textContent.trim(); }
      try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch (e) {}
    };
    const secs = [...document.querySelectorAll("section.ch[id]")];
    if (!secs.length || !("IntersectionObserver" in window)) { save(null); return; }
    let timer = null, current = null;
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) current = e.target;
      if (timer) return; // al massimo un salvataggio al secondo
      timer = setTimeout(() => { timer = null; if (current) save(current); }, 1000);
    }, { rootMargin: "-15% 0px -70% 0px" });
    secs.forEach(s => io.observe(s));
    window.addEventListener("pagehide", () => { if (current) save(current); });
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(LAST_KEY)); } catch (e) {}
    if (!prev || prev.p !== PAGE) save(null); // non perdiamo il capitolo se riapri la stessa pagina dall'inizio
  }

  /* ---------------- news e notifiche ----------------
     Le notizie stanno in news.json (nella cartella Unisa). Per pubblicarne una basta aggiungerla in cima alla lista.
     - il campanello nella barra ha un pallino quando c'è qualcosa di non letto
     - la home mostra la sezione News; aprendola le notizie contano come lette
     - con le notifiche attive, ogni notizia nuova arriva come notifica del sistema
       quando apri il sito (e, se il sito è installato come app su Android/PC, anche controllando in sottofondo) */
  const NEWS_SEEN = "news-lette", NEWS_ON = "news-notifiche";
  const NEWS_STATE = "ua-news-stato", NEWS_STATE_URL = ROOT + "__news-notificate";
  let news = [];
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const notifSupported = () => "Notification" in window && "serviceWorker" in navigator;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const fmtDay = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return d; } };

  // quali notizie sono già state notificate: in una cache, così lo vedono sia la pagina sia il service worker
  async function notifiedGet() { try { const r = await (await caches.open(NEWS_STATE)).match(NEWS_STATE_URL); return r ? await r.json() : null; } catch (e) { return null; } }
  async function notifiedSet(ids) { try { await (await caches.open(NEWS_STATE)).put(NEWS_STATE_URL, new Response(JSON.stringify(ids), { headers: { "Content-Type": "application/json" } })); } catch (e) {} }

  async function loadNews() {
    try {
      const r = await fetch(ROOT + "news.json", { cache: "no-cache" });
      const d = await r.json();
      news = (Array.isArray(d.news) ? d.news : []).filter(n => n && n.id && n.titolo);
    } catch (e) { news = []; }
    paintNewsDot();
    renderNews();
    notifyNew();
  }
  function unread() { const seen = new Set(lsGet(NEWS_SEEN, [])); return news.filter(n => !seen.has(n.id)); }
  function paintNewsDot() {
    const k = unread().length;
    document.querySelectorAll(".ua-news-btn").forEach(b => {
      b.querySelector(".ua-news-dot").hidden = !k;
      b.setAttribute("aria-label", k ? `News, ${k} da leggere` : "News");
      b.title = k ? `News · ${k} da leggere` : "News";
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
      const opt = { body: n.testo || "", tag: "news-" + n.id, icon: ROOT + "icon-192.png", badge: ROOT + "favicon-32.png", data: { url: ROOT + "index.html#news" } };
      try { if (reg) await reg.showNotification(n.titolo, opt); else new Notification(n.titolo, opt); } catch (e) {}
    }
  }

  async function enableNotifications() {
    let p = Notification.permission;
    if (p === "default") { try { p = await Notification.requestPermission(); } catch (e) {} }
    if (p !== "granted") { renderNews(); return; }
    lsSet(NEWS_ON, true);
    await notifiedSet(news.map(n => n.id)); // da adesso in poi: le notizie già uscite non arrivano come notifica
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.periodicSync) await reg.periodicSync.register("news", { minInterval: 6 * 60 * 60 * 1000 });
    } catch (e) {}
    try { const reg = await navigator.serviceWorker.getRegistration(ROOT); if (reg) reg.showNotification("Notifiche attive", { body: "Ti avviseremo qui quando arriva una notizia nuova.", tag: "news-on", icon: ROOT + "icon-192.png" }); } catch (e) {}
    renderNews();
  }
  async function disableNotifications() {
    lsSet(NEWS_ON, false);
    try { const reg = await navigator.serviceWorker.ready; if (reg.periodicSync) await reg.periodicSync.unregister("news"); } catch (e) {}
    renderNews();
  }

  function notifControl() {
    if (!notifSupported()) {
      return isIOS && !standalone()
        ? `<p class="ua-news-hint">Per le notifiche su iPhone: tocca <b>Condividi → Aggiungi alla schermata Home</b>, apri il sito dall'icona e attivale da qui.</p>`
        : `<p class="ua-news-hint">Questo browser non supporta le notifiche.</p>`;
    }
    if (Notification.permission === "denied") return `<p class="ua-news-hint">Le notifiche sono bloccate per questo sito: puoi riattivarle dalle impostazioni del browser.</p>`;
    if (Notification.permission === "granted" && lsGet(NEWS_ON, false)) {
      return `<div class="ua-news-on"><span class="ua-news-ok">${ICON.bell}Notifiche attive</span><button type="button" class="ua-news-link" data-news="off">Disattiva</button></div>`;
    }
    return `<button type="button" class="ua-news-cta" data-news="on">${ICON.bell}Attiva le notifiche</button>`;
  }

  function renderNews() {
    const box = document.getElementById("ua-news");
    if (!box) return;
    const fresh = new Set(unread().map(n => n.id));
    const corso = code => CORSI.find(c => c.code === code);
    const items = news.slice(0, 5).map(n => {
      const c = corso(n.corso);
      const tag = c ? `<span class="ua-news-tag" style="--c:var(--ua-c-${esc(c.color)})">${esc(c.code)}</span>` : "";
      const link = n.link ? ` <a href="${esc(/^https?:/.test(n.link) ? n.link : ROOT + n.link)}">Apri →</a>` : "";
      return `<li class="${fresh.has(n.id) ? "ua-news-new" : ""}"><div class="ua-news-meta">${tag}<time datetime="${esc(n.data || "")}">${esc(fmtDay(n.data || ""))}</time>${fresh.has(n.id) ? `<span class="ua-news-badge">nuova</span>` : ""}</div>
        <p class="ua-news-t">${esc(n.titolo)}</p>${n.testo || link ? `<p class="ua-news-x">${esc(n.testo || "")}${link}</p>` : ""}</li>`;
    }).join("");
    box.innerHTML = `<div class="ua-news-head"><h2>News</h2>${notifControl()}</div>
      ${news.length ? `<ul class="ua-news-list">${items}</ul>`
        : `<div class="ua-news-empty">${ICON.bell}<p><b>Qui arriveranno le notizie.</b> Nuovi appunti, quiz, cambi di programma e avvisi sui corsi: li trovi in questa sezione. Attiva le notifiche per saperlo subito.</p></div>`}`;
    box.querySelectorAll("[data-news]").forEach(b => b.addEventListener("click", () => b.dataset.news === "on" ? enableNotifications() : disableNotifications()));
    // le notizie si segnano come lette quando la sezione si vede davvero
    if (fresh.size && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); setTimeout(markRead, 1500); } }, { threshold: 0.4 });
      io.observe(box);
    }
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

  /* ---------------- avvio ---------------- */
  buildBar();
  buildCopyright();
  if (!IS_HOME) buildDock();
  buildPalette();
  loadNews();
  buildSyncDialog();
  applyTheme(getTheme());
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".ua-open-search, .ua-theme, .ua-open-sync");
    if (!b) return;
    if (b.classList.contains("ua-theme")) cycleTheme();
    else if (b.classList.contains("ua-open-sync")) openExport();
    else openSearch();
  });
  checkImport();
  trackLast();
  registerSW();
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openSearch() : closeSearch(); return; }
    if (IS_HOME && e.key === "/" && pal.hidden && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); openSearch(); }
  });
  if (IS_HOME) homeEffects();

  window.UA = { openSearch, closeSearch, cycleTheme };
})();
