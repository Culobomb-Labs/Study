/* Contatto per la risposta nelle segnalazioni.
   - Il modulo chiede un canale preferito ("Qui sul sito" di base) e, se serve, un secondo canale facoltativo.
   - "Email Google" usa l'email dell'account con cui si è fatto l'accesso: non si scrive niente. Nel database si salva solo
     il segnaposto "Email: account Google"; in lettura si mostra authorEmail, che le regole di Firestore garantiscono
     uguale all'email verificata dell'account. Così nessuno può spacciare un indirizzo altrui.
   - Telegram, Instagram e Discord sono controllati con un'espressione rigida per tipo: niente link, spazi, caratteri di controllo.
   - Il valore salvato è un testo unico, es. "Telegram: @mario · Email: account Google" (max 200 caratteri, come nelle regole).
     Vuoto = rispondi sul sito.
   - In lettura il testo NON è considerato affidabile: viene di nuovo analizzato e i link (t.me, instagram.com, mailto:)
     si costruiscono solo da parti valide. Tutto il resto resta testo semplice. */
(function () {
  "use strict";
  const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/;
  const GOOGLE_TOKEN = "account Google";
  const CH = {
    telegram: { label: "Telegram", ph: "@username", hint: "Lo username di Telegram, da 5 a 32 caratteri: lettere, numeri e _.",
      norm: v => v.replace(/^@/, ""), re: /^[A-Za-z][A-Za-z0-9_]{4,31}$/, show: v => "@" + v,
      href: v => "https://t.me/" + encodeURIComponent(v) },
    instagram: { label: "Instagram", ph: "@username", hint: "Lo username di Instagram, fino a 30 caratteri: lettere, numeri, punto e _.",
      norm: v => v.replace(/^@/, ""), re: /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/, show: v => "@" + v,
      href: v => "https://www.instagram.com/" + encodeURIComponent(v) + "/" },
    discord: { label: "Discord", ph: "username", hint: "Lo username di Discord, da 2 a 32 caratteri: lettere minuscole, numeri, punto e _.",
      norm: v => v.replace(/^@/, "").toLowerCase(), re: /^(?!.*\.\.)[a-z0-9._]{2,32}$/, show: v => v, href: null },
    google: { label: "Email", noInput: true }
  };
  const ORDER = ["telegram", "instagram", "discord", "google"];
  const SEP = " · ";
  const MAX = 200;
  const clean = s => String(s || "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g, "").trim();
  let userEmail = null;

  function check(type, raw) {
    const c = CH[type];
    if (!c || c.noInput) return { error: "Scegli un canale valido." };
    const v = c.norm(clean(raw));
    if (!v) return { error: `Scrivi il tuo username di ${c.label}.` };
    if (v.length > 120 || !c.re.test(v)) return { error: `Controlla il contatto ${c.label}. ${c.hint}` };
    return { value: v };
  }
  function part(type, raw) {
    if (type === "google") {
      if (!userEmail) return { error: "Per usare l'email del tuo account Google devi prima accedere." };
      return { value: `Email: ${GOOGLE_TOKEN}` };
    }
    const r = check(type, raw);
    return r.error ? r : { value: `${CH[type].label}: ${CH[type].show(r.value)}` };
  }

  /* lettura del modulo: { value, error, field } */
  function read() {
    const form = document.getElementById("form");
    if (!form) return { value: "" };
    const t1 = (form.querySelector('input[name="ch1"]:checked') || {}).value || "site";
    if (t1 === "site") return { value: "" };
    const a = part(t1, form.elements.c1.value);
    if (a.error) return { error: a.error, field: t1 === "google" ? null : "c1" };
    let out = a.value;
    const box2 = document.getElementById("contact2");
    if (box2 && !box2.hidden) {
      const t2 = form.elements.ch2.value, raw2 = clean(form.elements.c2.value);
      if (t2 && (t2 === "google" || raw2)) {
        if (t2 === t1) return { error: "Il secondo contatto deve essere di un altro tipo.", field: "ch2" };
        const b = part(t2, raw2);
        if (b.error) return { error: b.error, field: t2 === "google" ? "ch2" : "c2" };
        out += SEP + b.value;
      }
    }
    if (out.length > MAX) return { error: "Il contatto è troppo lungo." };
    return { value: out };
  }

  function link(doc, href, text) {
    const a = doc.createElement("a");
    a.href = href; a.textContent = text; a.rel = "noopener noreferrer nofollow"; a.target = "_blank";
    return a;
  }

  /* lettura di un contatto salvato (testo non affidabile) → nodo DOM sicuro.
     authorEmail: l'email dell'account che ha inviato la segnalazione (garantita dalle regole). */
  function render(str, doc, authorEmail) {
    doc = doc || document;
    const s = clean(str).slice(0, MAX), frag = doc.createDocumentFragment();
    if (!s) return frag;
    s.split(SEP).forEach((p, i) => {
      if (i) frag.append(doc.createTextNode(SEP));
      const span = doc.createElement("span"), lab = doc.createElement("b");
      span.className = "contact-part";
      if (p === `Email: ${GOOGLE_TOKEN}`) {
        lab.textContent = "Email (account Google) "; span.append(lab);
        const em = clean(authorEmail).toLowerCase();
        span.append(EMAIL_RE.test(em) ? link(doc, "mailto:" + em, em) : doc.createTextNode("quella dell'account"));
        frag.append(span); return;
      }
      const m = /^(Telegram|Instagram|Discord|Email): (.+)$/.exec(p);
      if (m && m[1] === "Email") { // formato precedente: email scritta a mano
        const em = clean(m[2]).toLowerCase();
        if (EMAIL_RE.test(em)) { lab.textContent = "Email "; span.append(lab, link(doc, "mailto:" + em, em)); frag.append(span); return; }
      }
      const type = m && ORDER.find(k => !CH[k].noInput && CH[k].label === m[1]);
      const ok = type && check(type, m[2]);
      if (ok && !ok.error) {
        const c = CH[type];
        lab.textContent = c.label + " "; span.append(lab);
        span.append(c.href ? link(doc, c.href(ok.value), c.show(ok.value)) : doc.createTextNode(c.show(ok.value)));
        frag.append(span);
      } else frag.append(doc.createTextNode(p)); // non riconosciuto: solo testo
    });
    return frag;
  }

  /* interfaccia del modulo */
  let repaint = () => {};
  function setup() {
    const form = document.getElementById("form");
    if (!form || !form.elements.c1) return;
    const f1 = document.getElementById("contact1"), i1 = form.elements.c1, h1 = document.getElementById("c1-hint");
    const box2 = document.getElementById("contact2"), add2 = document.getElementById("add-contact2"), rm2 = document.getElementById("rm-contact2");
    const s2 = form.elements.ch2, i2 = form.elements.c2, h2 = document.getElementById("c2-hint");
    const g1 = document.getElementById("google1"), g2 = document.getElementById("google2");
    const t1 = () => (form.querySelector('input[name="ch1"]:checked') || {}).value || "site";
    const googleText = el => {
      el.replaceChildren();
      if (userEmail) { el.append("Ti risponderemo a "); const b = document.createElement("b"); b.textContent = userEmail; el.append(b, ", l'email con cui hai fatto l'accesso."); el.dataset.state = ""; }
      else { el.textContent = "Accedi con Google per usare l'email del tuo account."; el.dataset.state = "warn"; }
    };
    function paint() {
      const t = t1(), on = t !== "site";
      const sh = document.getElementById("site-hint"); if (sh) sh.hidden = on;
      add2.hidden = !on || !box2.hidden;
      if (!on) { box2.hidden = true; i2.value = ""; }
      const gOn = t === "google";
      f1.hidden = !on || gOn; g1.hidden = !gOn; if (gOn) googleText(g1);
      if (on && !gOn) {
        i1.placeholder = CH[t].ph; h1.textContent = CH[t].hint;
        document.getElementById("c1-label").textContent = CH[t].label;
      }
      if (on) {
        [...s2.options].forEach(o => { o.disabled = o.value === t; });
        if (s2.value === t) s2.value = ORDER.find(k => k !== t);
      }
      const t2 = s2.value, g2On = t2 === "google";
      i2.hidden = g2On; h2.hidden = g2On; g2.hidden = !g2On || box2.hidden; if (g2On) googleText(g2);
      if (!g2On && CH[t2]) { i2.placeholder = CH[t2].ph; h2.textContent = CH[t2].hint; }
      document.querySelector(".c2-line").classList.toggle("no-input", g2On);
      [i1, i2, s2].forEach(x => x.removeAttribute("aria-invalid"));
    }
    repaint = paint;
    form.addEventListener("change", e => { if (e.target.name === "ch1" || e.target.name === "ch2") paint(); });
    [i1, i2].forEach(x => x.addEventListener("input", () => x.removeAttribute("aria-invalid")));
    add2.addEventListener("click", () => { box2.hidden = false; add2.hidden = true; paint(); s2.focus(); });
    rm2.addEventListener("click", () => { box2.hidden = true; i2.value = ""; paint(); add2.focus(); });
    form.addEventListener("reset", () => setTimeout(() => { box2.hidden = true; paint(); }, 0));
    paint();
  }

  window.UAContact = {
    read, render,
    setUser: email => { const e = clean(email).toLowerCase(); userEmail = EMAIL_RE.test(e) ? e : null; repaint(); },
    mark: field => { const el = field && document.getElementById("form").elements[field]; if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); } }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();
})();
