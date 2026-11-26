/* Programma d'esame: disegna la pagina di un corso (Unisa/<corso>/Piano di studio XX.html).
   I dati restano nella pagina, perché TOPICS e SCOPES li legge anche la Sessione (assets/sessione.js).
   La pagina chiama PROGRAMMA({ … }) con:
     code    sigla del corso nella Sessione (es. "BD")
     name    nome del corso
     q       quaderno; quiz: quiz del corso (o "")
     key     chiave del piano fatto sulla pagina prima della Sessione (progressKey in corsi.js)
     topics  TOPICS; scopes: SCOPES; names: nome di ogni prova (solo se sono più di una, es. IS)
     prova   com'è l'esame: { intro, rows: [{ n, t, r, s }], nota } (facoltativo);
             { wip: true } quando non è ancora sicuro: si vede solo l'immagine "work in progress"
     tag     funzione che dà un'etichetta in più per un argomento (facoltativa, es. "prima prova")
     next    la prossima prova con il conto alla rovescia: { date, t, s } (facoltativo) */
(function () {
  "use strict";
  const SESSIONE = "../sessione.html";
  const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  const PRI = { 5: ["p5", "Molto importante"], 4: ["p4", "Importante"] };
  // "work in progress": una transenna da cantiere nel colore del corso (com'è l'esame non è ancora sicuro)
  const WIP = `<div class="wip" role="img" aria-label="Work in progress">
    <svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="wip-st" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect class="wip-a" width="14" height="28"/><rect class="wip-b" x="14" width="14" height="28"/>
        </pattern>
      </defs>
      <circle class="wip-l" cx="82" cy="22" r="7"/><circle class="wip-l" cx="238" cy="22" r="7"/>
      <rect class="wip-p" x="78" y="28" width="8" height="8"/><rect class="wip-p" x="234" y="28" width="8" height="8"/>
      <rect class="wip-p" x="72" y="76" width="10" height="46"/><rect class="wip-p" x="238" y="76" width="10" height="46"/>
      <rect class="wip-p" x="58" y="120" width="38" height="7" rx="3"/><rect class="wip-p" x="224" y="120" width="38" height="7" rx="3"/>
      <rect x="40" y="36" width="240" height="40" rx="6" fill="url(#wip-st)"/>
      <rect class="wip-o" x="40" y="36" width="240" height="40" rx="6"/>
      <text class="wip-t" x="160" y="146" text-anchor="middle">WORK IN PROGRESS</text>
    </svg>
  </div>`;

  const $ = s => document.querySelector(s);
  const esc = s =>
    String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const iso = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = s => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const fmtMin = m => {
    m = Math.round(m / 5) * 5;
    const h = Math.floor(m / 60),
      r = m % 60;
    return h ? (r ? `${h} h ${r}′` : `${h} h`) : `${r}′`;
  };
  const read = k => {
    try {
      return JSON.parse(localStorage.getItem(k)) || {};
    } catch (e) {
      return {};
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  };

  function PROGRAMMA(P) {
    const study = P.topics.filter(t => !t.intro);
    const scopes = Object.keys(P.scopes);

    /* la prossima prova, con il conto alla rovescia (sparisce quando è passata) */
    function next() {
      const box = $("#next");
      if (!P.next || !box) return;
      const d = parse(P.next.date),
        n = Math.round((d - parse(iso(new Date()))) / 864e5);
      box.hidden = n < 0;
      if (n < 0) return;
      box.innerHTML = `<div class="day">${WD[d.getDay()]}<b>${d.getDate()}</b>${MESI[d.getMonth()]}</div>
        <div><h3>${esc(P.next.t)}</h3><p>${esc(P.next.s)}</p></div>
        <div class="cd">${n === 0 ? "oggi" : n}${n ? `<small>${n === 1 ? "giorno" : "giorni"}</small>` : ""}</div>`;
    }

    /* Sessione: se il corso c'è già si apre, altrimenti si aggiunge (sessione.html?esame=XX) */
    function cta() {
      const sess = read("ua-sessione");
      const inSess = sess.cfg && (sess.cfg.exams || []).some(e => e.code === P.code);
      $("#cta").innerHTML = inSess
        ? `<div><b>${esc(P.name)} è già nella tua Sessione</b><p>Il piano giorno per giorno, con le spunte, è lì.</p></div>
          <a class="btn solid" href="${SESSIONE}#oggi">Apri la Sessione →</a>`
        : `<div><b>Prepara l'esame con la Sessione</b><p>Scegli la data e quanto lo sai già: la Sessione fa il piano giorno per giorno, anche per un esame solo.</p></div>
          <a class="btn solid" href="${SESSIONE}?esame=${encodeURIComponent(P.code)}">Prepara questo esame →</a>`;
    }

    /* Com'è l'esame: la prova (se la conosciamo), su cosa puntare e la simulazione di ogni prova */
    function prova() {
      const A = P.prova;
      if (A && A.wip) {
        $("#prova").innerHTML = WIP;
        return;
      }
      const many = scopes.length > 1,
        lbl = k => (many ? `<b>${esc(P.names[k])}:</b> ` : "");
      const focus = scopes.map(k => `${lbl(k)}${esc(P.scopes[k].focus)}.`);
      const sims = scopes.map(k => `${lbl(k)}${esc(P.scopes[k].sim.t)} · ${esc(P.scopes[k].sim.s)}`);
      const list = (h, items) =>
        many ? `<b>${h}</b><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>` : `<b>${h}</b> ${items[0]}`;
      $("#prova").innerHTML = `
        ${A && A.intro ? `<p class="muted">${esc(A.intro)}</p>` : ""}
        ${
          A && A.rows
            ? `<div class="box">${A.rows
                .map(
                  e =>
                    `<div class="es"><span class="n">${esc(e.n)}</span><span>${esc(e.t)}</span><span class="pt">${esc(e.r || "")}</span>${e.s ? `<small>${esc(e.s)}</small>` : ""}</div>`
                )
                .join("")}</div>`
            : ""
        }
        <div class="note">${list("Su cosa puntare:", focus)}${A && A.nota ? ` ${esc(A.nota)}` : ""}</div>
        <div class="note">${list("Per allenarti:", sims)}${P.quiz ? ` <a href="${P.quiz}">Apri il quiz →</a>` : ""}</div>`;
    }

    /* Gli argomenti, divisi per parte del corso */
    function topics() {
      const intro = P.topics.filter(t => t.intro);
      $("#intro").innerHTML = intro.length
        ? `<div class="note intro-tip"><b>Facoltativo, se ti serve.</b> Introduttivi, non serve soffermarsi: ${intro
            .map(t => `<a href="${P.q}#${t.cid}">cap. ${t.ch} ${esc(t.t)}</a>`)
            .join(" · ")}</div>`
        : "";
      const pkgs = [...new Set(study.map(t => t.pkg))];
      $("#topics").innerHTML = pkgs
        .map(
          pk => `<section class="pkg"><div class="hd"><span class="k">${esc(pk)}</span></div>
          ${study
            .filter(t => t.pkg === pk)
            .map(t => {
              const [cls, lbl] = PRI[t.pri] || ["", "Da sapere"],
                tg = P.tag ? P.tag(t) : "";
              return `<article class="top">
                <div class="top-h"><span class="n">${esc(t.ch)}</span><h3><a href="${P.q}#${t.cid}">${esc(t.t)}</a></h3>
                  <span class="bdg"><span class="pri ${cls}">${lbl}</span>${tg ? `<span class="pri tg">${esc(tg)}</span>` : ""}</span></div>
                <p class="s">${esc(String(t.read || "").replace(/^Cap\. [\d ·]+: /, ""))}</p>
                <dl>${t.draw ? `<div><dt>Esercizio tipo</dt><dd>${esc(t.draw)}</dd></div>` : ""}${t.open ? `<div><dt>Domanda aperta</dt><dd>${esc(t.open)}</dd></div>` : ""}</dl>
              </article>`;
            })
            .join("")}</section>`
        )
        .join("");
    }

    /* Il piano fatto sulla pagina prima della Sessione: si vede finché c'è, con le sue spunte */
    function plan() {
      const st = read(P.key),
        box = $("#planBox");
      $("#vecchio").hidden = !st.plan;
      if (!st.plan) {
        box.innerHTML = "";
        return;
      }
      const p = st.plan,
        done = st.done || {};
      const all = p.days.flatMap(d => d.tasks),
        nd = all.filter(t => done[t.id]).length;
      const today = iso(new Date()),
        ex = parse(p.exam);
      box.innerHTML = `
        <div class="status">
          <div><span class="tag">Piano per l'esame</span><br><b class="big">${nd}/${all.length}</b> <span class="muted">attività fatte</span></div>
          <div class="actions no-print"><button class="btn" type="button" id="print">Stampa</button><button class="btn" type="button" id="del">Elimina questo piano</button></div>
          <div class="bar"><i style="width:${all.length ? (100 * nd) / all.length : 0}%"></i></div>
        </div>
        ${(p.warnings || []).length ? `<p class="plan-note">Il piano si adatta ai giorni che ci sono: alcune attività possono essere più brevi o concentrate negli ultimi giorni.</p>` : ""}
        <div class="plan">${p.days
          .map(d => {
            const dt = parse(d.date),
              tot = d.tasks.reduce((a, t) => a + t.m, 0);
            const dn = d.tasks.length && d.tasks.every(t => done[t.id]);
            const tags = [...new Set(d.tasks.filter(t => t.topic).map(t => t.topic.t))];
            const title = tags.length
              ? tags.join(" · ")
              : d.tasks.some(t => t.k === "sim")
                ? "Simulazione e ripasso finale"
                : "Ripasso";
            return `<section class="dcard${d.date === today ? " today" : ""}${dn ? " done" : ""}">
              <div class="dh"><div class="dt">${WD[dt.getDay()]}<b>${dt.getDate()}</b>${MESI[dt.getMonth()]}</div>
                <div>${d.date === today ? `<span class="tag">Oggi</span>` : ""}<h3>${esc(title)}</h3></div><span class="min">${fmtMin(tot)}</span></div>
              <ul>${d.tasks
                .map(
                  t => `<li><label><input type="checkbox" data-id="${t.id}" ${done[t.id] ? "checked" : ""}>
                <span class="tx">${esc(t.t)}${t.part ? ` (parte ${t.part})` : ""}${t.topic && !/^Ripasso/.test(t.t) ? ` · <span class="muted">${esc(t.topic.t)}</span>` : ""}
                <small>${esc(t.s)}${t.href ? ` · <a href="${t.href}">apri</a>` : ""}</small></span>
                ${t.m ? `<span class="tm">${fmtMin(t.m)}</span>` : ""}</label></li>`
                )
                .join("")}</ul>
            </section>`;
          })
          .join("")}
          <section class="dcard exam-day"><div class="dh"><div class="dt">${WD[ex.getDay()]}<b>${ex.getDate()}</b>${MESI[ex.getMonth()]}</div><div><h3>Esame</h3><span style="opacity:.75;font-size:14.5px">Colazione, niente roba nuova. Leggi tutta la traccia prima di cominciare.</span></div><span></span></div></section>
        </div>`;
      box.querySelectorAll("input[type=checkbox]").forEach(cb =>
        cb.addEventListener("change", () => {
          const s = read(P.key);
          s.done = s.done || {};
          if (cb.checked) s.done[cb.dataset.id] = true;
          else delete s.done[cb.dataset.id];
          write(P.key, s);
          plan();
        })
      );
      $("#print").onclick = () => window.print();
      $("#del").onclick = () => {
        if (confirm("Elimino il piano e le sue spunte?")) {
          write(P.key, {});
          plan();
        }
      };
    }

    /* scheda evidenziata in base alla parte di pagina visibile */
    function tabs() {
      const list = [...document.querySelectorAll(".tabs a[data-t]")];
      const mark = () => {
        const y = window.scrollY + 90,
          arg = document.getElementById("argomenti").getBoundingClientRect().top + window.scrollY;
        list.forEach(a => a.classList.toggle("on", (a.dataset.t === "argomenti") === y >= arg));
      };
      window.addEventListener("scroll", mark, { passive: true });
      mark();
    }

    next();
    cta();
    prova();
    topics();
    plan();
    tabs();
    /* se un altro dispositivo aggiorna le spunte o la Sessione (sincronizzazione), ridisegna */
    window.addEventListener("storage", e => {
      if (e.key === P.key) plan();
      if (e.key === "ua-sessione") cta();
    });
  }

  window.PROGRAMMA = PROGRAMMA;
})();
