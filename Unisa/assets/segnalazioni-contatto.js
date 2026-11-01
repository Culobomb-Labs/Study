/* Contatto per la risposta nelle segnalazioni.
   - Il modulo chiede un canale preferito ("Qui sul sito" di base) e, se serve, un secondo canale facoltativo.
   - Ogni recapito è controllato con un'espressione rigida per tipo: niente link, spazi, caratteri di controllo.
   - Il valore salvato è un testo unico, es. "Telegram: @mario · Email: m.rossi@studenti.unisa.it" (max 200 caratteri,
     come chiedono le regole di Firestore). Vuoto = rispondi sul sito.
   - In lettura il testo NON è considerato affidabile: viene di nuovo analizzato con le stesse espressioni e i link
     (t.me, instagram.com, mailto:) si costruiscono solo da parti che le rispettano. Tutto il resto resta testo semplice. */
(function () {
  "use strict";
  const CH = {
    telegram: { label: "Telegram", ph: "@username", hint: "Lo username di Telegram, da 5 a 32 caratteri: lettere, numeri e _.",
      norm: v => v.replace(/^@/, ""), re: /^[A-Za-z][A-Za-z0-9_]{4,31}$/, show: v => "@" + v,
      href: v => "https://t.me/" + encodeURIComponent(v) },
    instagram: { label: "Instagram", ph: "@username", hint: "Lo username di Instagram, fino a 30 caratteri: lettere, numeri, punto e _.",
      norm: v => v.replace(/^@/, ""), re: /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/, show: v => "@" + v,
      href: v => "https://www.instagram.com/" + encodeURIComponent(v) + "/" },
    discord: { label: "Discord", ph: "username", hint: "Lo username di Discord, da 2 a 32 caratteri: lettere minuscole, numeri, punto e _.",
      norm: v => v.replace(/^@/, "").toLowerCase(), re: /^(?!.*\.\.)[a-z0-9._]{2,32}$/, show: v => v, href: null },
    email: { label: "Email", ph: "nome@studenti.unisa.it", hint: "Un indirizzo email valido, anche diverso da quello dell'account Google.",
      norm: v => v.toLowerCase(), re: /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/, show: v => v,
      href: v => "mailto:" + v }
  };
  const ORDER = ["telegram", "instagram", "discord", "email"];
  const SEP = " · ";
  const MAX = 200;
  const clean = s => String(s || "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g, "").trim();

  function check(type, raw) {
    const c = CH[type];
    if (!c) return { error: "Scegli un canale valido." };
    const v = c.norm(clean(raw));
    if (!v) return { error: `Scrivi il tuo ${c.label === "Email" ? "indirizzo email" : "username di " + c.label}.` };
    if (v.length > 120 || !c.re.test(v)) return { error: `Controlla il contatto ${c.label}. ${c.hint}` };
    return { value: v };
  }

  /* lettura del modulo: { value, error } */
  function read() {
    const form = document.getElementById("form");
    if (!form) return { value: "" };
    const t1 = (form.querySelector('input[name="ch1"]:checked') || {}).value || "site";
    if (t1 === "site") return { value: "" };
    const a = check(t1, form.elements.c1.value);
    if (a.error) return { error: a.error, field: "c1" };
    let out = `${CH[t1].label}: ${CH[t1].show(a.value)}`;
    const box2 = document.getElementById("contact2");
    if (box2 && !box2.hidden) {
      const t2 = form.elements.ch2.value, raw2 = clean(form.elements.c2.value);
      if (t2 && raw2) {
        if (t2 === t1) return { error: "Il secondo contatto deve essere di un altro tipo.", field: "ch2" };
        const b = check(t2, raw2);
        if (b.error) return { error: b.error, field: "c2" };
        out += SEP + `${CH[t2].label}: ${CH[t2].show(b.value)}`;
      }
    }
    if (out.length > MAX) return { error: "Il contatto è troppo lungo." };
    return { value: out };
  }

  /* lettura di un contatto salvato (testo non affidabile) → nodo DOM sicuro */
  function render(str, doc) {
    doc = doc || document;
    const s = clean(str).slice(0, MAX), frag = doc.createDocumentFragment();
    if (!s) return frag;
    s.split(SEP).forEach((part, i) => {
      if (i) frag.append(doc.createTextNode(SEP));
      const m = /^(Telegram|Instagram|Discord|Email): (.+)$/.exec(part);
      const type = m && ORDER.find(k => CH[k].label === m[1]);
      const ok = type && check(type, m[2]);
      if (ok && !ok.error) {
        const c = CH[type], span = doc.createElement("span");
        span.className = "contact-part";
        const lab = doc.createElement("b"); lab.textContent = c.label + " ";
        span.append(lab);
        if (c.href) {
          const a = doc.createElement("a");
          a.href = c.href(ok.value); a.textContent = c.show(ok.value);
          a.rel = "noopener noreferrer nofollow"; a.target = "_blank";
          span.append(a);
        } else span.append(doc.createTextNode(c.show(ok.value)));
        frag.append(span);
      } else frag.append(doc.createTextNode(part)); // formato vecchio o non riconosciuto: solo testo
    });
    return frag;
  }

  /* interfaccia del modulo */
  function setup() {
    const form = document.getElementById("form");
    if (!form || !form.elements.c1) return;
    const f1 = document.getElementById("contact1"), i1 = form.elements.c1, h1 = document.getElementById("c1-hint");
    const box2 = document.getElementById("contact2"), add2 = document.getElementById("add-contact2"), rm2 = document.getElementById("rm-contact2");
    const s2 = form.elements.ch2, i2 = form.elements.c2, h2 = document.getElementById("c2-hint");
    const t1 = () => (form.querySelector('input[name="ch1"]:checked') || {}).value || "site";
    function paint() {
      const t = t1(), on = t !== "site";
      f1.hidden = !on; add2.hidden = !on || !box2.hidden;
      const sh = document.getElementById("site-hint"); if (sh) sh.hidden = on;
      if (!on) { box2.hidden = true; i2.value = ""; }
      if (on) {
        i1.placeholder = CH[t].ph; i1.type = t === "email" ? "email" : "text";
        i1.autocomplete = t === "email" ? "email" : "off"; i1.inputMode = t === "email" ? "email" : "text";
        h1.textContent = CH[t].hint;
        document.getElementById("c1-label").textContent = CH[t].label;
        [...s2.options].forEach(o => { o.disabled = o.value === t; });
        if (s2.value === t) s2.value = ORDER.find(k => k !== t);
      }
      const t2 = s2.value;
      i2.placeholder = CH[t2] ? CH[t2].ph : ""; i2.type = t2 === "email" ? "email" : "text"; i2.inputMode = t2 === "email" ? "email" : "text";
      h2.textContent = CH[t2] ? CH[t2].hint : "";
      [i1, i2].forEach(x => x.removeAttribute("aria-invalid"));
    }
    form.addEventListener("change", e => { if (e.target.name === "ch1" || e.target.name === "ch2") paint(); });
    [i1, i2].forEach(x => x.addEventListener("input", () => x.removeAttribute("aria-invalid")));
    add2.addEventListener("click", () => { box2.hidden = false; add2.hidden = true; s2.focus(); paint(); });
    rm2.addEventListener("click", () => { box2.hidden = true; i2.value = ""; paint(); add2.focus(); });
    form.addEventListener("reset", () => setTimeout(() => { box2.hidden = true; paint(); }, 0));
    paint();
  }

  window.UAContact = { read, render, mark: field => { const el = document.getElementById("form").elements[field]; if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); } } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup); else setup();
})();
