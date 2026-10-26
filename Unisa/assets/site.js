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
      const hay = norm(c.name + " " + c.code + " " + d.name + " " + d.kind);
      if (!terms.length || terms.every(t => hay.includes(t)))
        docs.push({ href: url(d.path), path: d.path, color: c.color, title: esc(d.name), tag: c.code, text: esc(c.name + " · " + d.kind) });
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
  if (!IS_HOME) buildDock();
  buildPalette();
  applyTheme(getTheme());
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".ua-open-search, .ua-theme");
    if (!b) return;
    if (b.classList.contains("ua-theme")) cycleTheme(); else openSearch();
  });
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openSearch() : closeSearch(); return; }
    if (IS_HOME && e.key === "/" && pal.hidden && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); openSearch(); }
  });
  if (IS_HOME) homeEffects();

  window.UA = { openSearch, closeSearch, cycleTheme };
})();
