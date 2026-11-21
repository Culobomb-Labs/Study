/* Appunti Unisa · Sessione d'esami: il "motore" condiviso dalla pagina sessione.html (impostazione e calendario)
   e dalla home (card "Sessione"). Non disegna niente: prepara i dati.

   Indice:
   - catalogo .................. tutti i corsi dei tre anni (cartelle del Drive Coscienze) + quelli del sito
   - date e tempi .............. giorni in formato AAAA-MM-GG, minuti → "1 h 30"
   - salvataggio ............... localStorage "ua-sessione" (si sincronizza con l'account: vedi isSynced in site.js)
   - argomenti ................. letti dai piani di studio del sito (TOPICS), oppure capitoli/blocchi di studio
   - piano ..................... divisione "mista": in parallelo, ma gli ultimi giorni prima di ogni esame solo per lui;
                                 il progetto (se c'è) è una traccia in più, con la sua data di consegna
   - ricalcolo ................. le attività rimaste indietro si spostano da oggi in poi
   - riepilogo ................. quello che serve alla card della home

   Cosa si salva in "ua-sessione" (i testi stanno una volta sola in plan.items; i giorni hanno solo i pezzi):
   { v: 1,
     cfg:  { exams: [{ code, name, date, lv, scope, hours, chapters, prj: { on, hours, date } }],
             start, hours, days, ded, notify, ore: [ore dei promemoria] },
     plan: { built, start, recap, items: { iid: { c, k, t, top, s, m, href, quiz } },
             days: [{ date, exam?, due?, ded?, tasks: [{ id, iid, m }] }], warnings, notes, replanned,
             intro: { sigla: [{ ch, t, href }] } (capitoli introduttivi: solo consiglio) },
     done: { idPezzo: true } } */
(function () {
  const KEY = "ua-sessione";

  /* ---------------- catalogo ---------------- */
  // code: sigla; site: sigla del corso in assets/corsi.js (se ha appunti sul sito); year: anno; opt: corso a scelta
  const CATALOGO = [
    { code: "AN", name: "Analisi Matematica", year: 1 },
    { code: "AE", name: "Architettura degli Elaboratori", year: 1 },
    { code: "MD", name: "Matematica Discreta", year: 1 },
    { code: "MMI", name: "Metodi Matematici per l'Informatica", year: 1 },
    { code: "P1", name: "Programmazione I", year: 1 },
    { code: "PSD", name: "Programmazione e Strutture Dati", year: 1 },
    { code: "BD", site: "BD", year: 2 },
    { code: "CPSM", name: "Calcolo delle Probabilità e Statistica Matematica", year: 2 },
    { code: "PA", name: "Programmazione Avanzata", year: 2 },
    { code: "PO", site: "PO", year: 2 },
    { code: "RC", name: "Reti di Calcolatori", year: 2 },
    { code: "SO", site: "SO", year: 2 },
    { code: "ETC", name: "Elementi di Teoria della Computazione", year: 3 },
    { code: "IS", site: "IS", year: 3 },
    { code: "PD", site: "PD", year: 3 },
    { code: "RO", name: "Ricerca Operativa", year: 3 },
    { code: "AL", site: "AL", year: 3 },
    { code: "MP", site: "MP", year: 3, opt: true },
    { code: "FIA", name: "Fondamenti di Intelligenza Artificiale", year: 3, opt: true },
    { code: "IUM", name: "Interazione Uomo-Macchina", year: 3, opt: true },
    { code: "CS", name: "Calcolo Scientifico", year: 3, opt: true },
    { code: "GI", name: "Grafica e Interattività", year: 3, opt: true },
    { code: "SIC", name: "Sicurezza", year: 3, opt: true },
    { code: "ML", name: "Machine Learning", year: 3, opt: true },
    { code: "SIM", name: "Simulazione", year: 3, opt: true }
  ];
  // colori per i corsi senza appunti sul sito: toni medi, leggibili sia in chiaro sia in scuro
  const ALTRI_COLORI = [
    "#0e7490",
    "#b45309",
    "#7c3aed",
    "#be123c",
    "#4d7c0f",
    "#0369a1",
    "#a16207",
    "#0f766e"
  ];

  // il catalogo completo, con nome, colore, piano di studio, quaderno e quiz presi da corsi.js per i corsi del sito
  function courses() {
    const site = window.CORSI || [];
    let k = 0;
    return CATALOGO.map(e => {
      const c = e.site ? site.find(x => x.code === e.site) : null;
      const doc = kind => c && c.docs.find(d => d.kind === kind);
      const piano = doc("Piano di studio"),
        quad = doc("Quaderno"),
        quiz = doc("Quiz");
      return {
        code: e.code,
        name: c ? c.name : e.name,
        year: e.year,
        opt: !!e.opt,
        color: c ? `var(--ua-c-${c.color})` : ALTRI_COLORI[k++ % ALTRI_COLORI.length],
        piano: piano ? piano.path : null,
        quaderno: quad ? quad.path : null,
        quiz: quiz ? quiz.path : null
      };
    });
  }
  const courseOf = code => courses().find(c => c.code === code);

  /* ---------------- date e tempi ---------------- */
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const today = () => iso(new Date());
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const r5 = m => Math.round(m / 5) * 5;
  // codice di un pezzo del calendario: attività, giorno e un suffisso casuale (due pezzi possono cadere nello stesso giorno)
  const pid = (iid, date) => `${iid}~${date}~${Math.random().toString(36).slice(2, 7)}`;
  const fmtMin = m => {
    m = r5(m);
    const h = Math.floor(m / 60),
      r = m % 60;
    return h ? (r ? `${h} h ${r}′` : `${h} h`) : `${r}′`;
  };
  const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const WD_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  const fmtDay = s => {
    const d = parse(s);
    return `${WD[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
  };
  // percorso di un file del sito (gli spazi vanno codificati)
  const href = (root, path, hash) =>
    root + path.split("/").map(encodeURIComponent).join("/") + (hash ? "#" + hash : "");

  /* ---------------- salvataggio ---------------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      return s && typeof s === "object" && s.cfg ? s : null;
    } catch (e) {
      return null;
    }
  }
  function save(st) {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {}
  }
  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  /* ---------------- argomenti ---------------- */
  const LEVELS = [
    { v: 0, t: "Da zero", f: 1 },
    { v: 1, t: "L'ho letto", f: 0.6 },
    { v: 2, t: "Lo so bene", f: 0.3 }
  ];
  // legge TOPICS (e il ripasso finale "recap" di ogni prova) dalla pagina del piano di studio
  const topicCache = {};
  function topicsOf(course, root) {
    if (!course.piano) return Promise.resolve(null);
    if (!topicCache[course.code])
      topicCache[course.code] = fetch(href(root, course.piano))
        .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
        .then(text => {
          const m = text.match(/const TOPICS\s*=\s*(\[[\s\S]*?\n\s*\]);/);
          if (!m) throw new Error("argomenti non trovati");
          // sono dati scritti da noi nel piano: alcuni piani usano chiavi senza virgolette, quindi niente JSON.parse
          const topics = Function('"use strict"; return (' + m[1] + ")")();
          const recap = {};
          text.replace(/(\w+): \{ topics:[\s\S]*?recap: "((?:[^"\\]|\\.)*)"/g, (_, k, r) => {
            recap[k] = r;
          });
          return { topics, recap, prove: topics.some(t => t.full) };
        })
        .catch(e => {
          delete topicCache[course.code];
          throw e;
        });
    return topicCache[course.code];
  }

  /* Le attività di un esame, prima di dividerle nei giorni: una per capitolo.
     Per i corsi con piano di studio: lettura + (esercizio, domanda aperta, quiz). "parts" serve a togliere gli extra
     se il tempo non basta. Per gli altri corsi: i capitoli scritti da chi studia, oppure blocchi da un'ora. */
  function buildItems(exam, course, data, root) {
    const lv = exam.lv || 0,
      f = (LEVELS[lv] || LEVELS[0]).f;
    const items = [];
    const add = (id, o) =>
      items.push(Object.assign({ iid: `${exam.code}.${id}`, c: exam.code, k: "top" }, o));
    if (data) {
      /* I capitoli introduttivi ("intro" nel piano di studio) non entrano mai: sono solo un consiglio (plan.intro).
         IS: prima prova = argomenti senza "full"; seconda prova = quelli "full" (non c'erano nella prima) */
      const study = data.topics.filter(t => !t.intro);
      const topics =
        exam.scope === "prima"
          ? study.filter(t => !t.full)
          : exam.scope === "seconda"
            ? study.filter(t => t.full)
            : study;
      const verb = lv === 2 ? "Ripassa" : lv === 1 ? "Rileggi" : "Studia";
      topics.forEach(t => {
        const parts = { read: Math.max(15, r5(t.min * f)) };
        if (lv < 2 && t.draw) parts.draw = lv === 0 ? 25 : 20;
        if (lv < 2 && t.open) parts.open = 10;
        if (course.quiz) parts.quiz = 10;
        const o = {
          t: `${verb}: ${t.t}`,
          top: t.t,
          ch: t.ch,
          pri: t.pri || 3,
          s: t.read || "",
          ex: t.draw || "",
          parts,
          m: Object.values(parts).reduce((a, b) => a + b, 0)
        };
        if (course.quaderno) o.href = href(root, course.quaderno, t.cid);
        if (course.quiz) o.quiz = href(root, course.quiz);
        add(t.id, o);
      });
    } else {
      const total = Math.max(60, Math.round((exam.hours || 30) * 60 * f));
      const chapters = (exam.chapters || "")
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
      if (chapters.length) {
        const m = Math.max(20, r5(total / chapters.length));
        chapters.forEach((c, i) =>
          add(`cap${i}`, {
            t: `${lv === 2 ? "Ripassa" : "Studia"}: ${c}`,
            top: c,
            s: "Leggi, fai uno schema e ripeti a voce",
            pri: 3,
            parts: { read: m },
            m
          })
        );
      } else {
        const n = Math.ceil(total / 60);
        for (let i = 0; i < n; i++) {
          const m = i === n - 1 ? total - 60 * (n - 1) || 60 : 60;
          add(`blocco${i}`, {
            t: `Studio · blocco ${i + 1} di ${n}`,
            top: `blocco ${i + 1}`,
            s: "Vai avanti col programma: appunti, slide ed esercizi",
            pri: 3,
            parts: { read: m },
            m
          });
        }
      }
    }
    return items;
  }

  /* Il progetto di un esame (se c'è): blocchi da un'ora fino alla consegna, su una traccia a parte
     (tr = "<sigla>#prj"), così va in parallelo allo studio e non si accorcia mai di nascosto. */
  const PRJ = "#prj";
  const prjDate = e => (e.prj && e.prj.date) || e.date;
  function projectItems(exam) {
    const p = exam.prj;
    if (!p || !p.on || !(p.hours > 0)) return [];
    const total = Math.round(p.hours * 60),
      n = Math.ceil(total / 60);
    const out = [];
    for (let i = 0; i < n; i++) {
      const m = i === n - 1 ? total - 60 * (n - 1) || 60 : 60;
      out.push({
        iid: `${exam.code}.prj${i}`,
        c: exam.code,
        tr: exam.code + PRJ,
        k: "prj",
        t: `Progetto · blocco ${i + 1} di ${n}`,
        top: `progetto, blocco ${i + 1}`,
        s: "Avanza col progetto: codice, documentazione e prove",
        pri: 3,
        parts: { read: m },
        m
      });
    }
    return out;
  }

  // se il tempo non basta: 1) via esercizio e domanda aperta dagli argomenti meno importanti, 2) si accorcia tutto
  function compress(items, ratio) {
    const out = items.map(i => Object.assign({}, i, { parts: Object.assign({}, i.parts) }));
    const need = () => out.reduce((a, i) => a + i.m, 0);
    const target = need() * ratio;
    const order = out.filter(i => i.parts.draw || i.parts.open).sort((a, b) => a.pri - b.pri);
    for (const i of order) {
      if (need() <= target || i.pri >= 5) break;
      delete i.parts.draw;
      delete i.parts.open;
      i.m = Object.values(i.parts).reduce((a, b) => a + b, 0);
      i.cut = true;
    }
    if (need() > target) {
      const k = target / need();
      out.forEach(i => {
        i.m = Math.max(10, r5(i.m * k));
        i.cut = true;
      });
    }
    return out;
  }

  /* ---------------- piano ---------------- */
  /* Divisione "mista":
     1. gli ultimi `ded` giorni di studio prima di ogni esame sono solo per quell'esame (ripasso e simulazione);
     2. negli altri giorni gli esami vanno in parallelo: ognuno riceve ogni giorno il "ritmo" che gli serve per finire
        in tempo (minuti che restano ÷ giorni che restano), così l'esame più vicino prende di più;
     3. se il tempo non basta, si riprova con le attività accorciate (compress), finché ci stanno. */
  function schedule(cfg, itemsByExam, start) {
    const cap = Math.round(cfg.hours * 60);
    const ded = Math.max(0, cfg.ded == null ? 2 : cfg.ded);
    const byDateAsc = (a, b) => (a.date < b.date ? -1 : 1);
    // l'esame di oggi resta nel calendario, ma per lui non si studia più
    const shown = cfg.exams.filter(e => e.date >= start).sort(byDateAsc);
    const exams = shown.filter(e => e.date > start);
    // le tracce: lo studio di ogni esame (scadenza: l'esame) e i progetti (scadenza: la consegna)
    const projects = cfg.exams
      .filter(e => e.prj && e.prj.on && (itemsByExam[e.code + PRJ] || []).length && prjDate(e) > start)
      .map(e => ({ code: e.code + PRJ, date: prjDate(e) }));
    const tracks = exams.map(e => ({ code: e.code, date: e.date })).concat(projects);
    const dues = cfg.exams
      .filter(e => e.prj && e.prj.on && prjDate(e) >= start)
      .map(e => ({ code: e.code, date: prjDate(e) }));
    const examDates = new Set(exams.map(e => e.date));
    const last = tracks.reduce((a, t) => (t.date > a ? t.date : a), start);

    // giorni in cui si studia (non quelli degli esami)
    const study = [];
    for (let d = parse(start); iso(d) < last; d = addDays(d, 1)) {
      const s = iso(d);
      if (cfg.days.includes(d.getDay()) && !examDates.has(s)) study.push(s);
    }
    // giorni dedicati: per ogni esame (dal più vicino) gli ultimi giorni prima della sua data, dopo l'esame precedente
    const dedOf = {};
    let prev = start;
    exams.forEach(e => {
      const win = study.filter(s => s >= prev && s < e.date && !dedOf[s]);
      win.slice(-ded).forEach(s => (dedOf[s] = e.code));
      prev = e.date;
    });

    const queue = {};
    tracks.forEach(e => (queue[e.code] = (itemsByExam[e.code] || []).map(i => ({ iid: i.iid, left: i.m }))));
    const remaining = code => queue[code].reduce((a, i) => a + i.left, 0);
    const days = study.map(s => ({ date: s, ded: dedOf[s] || null, tasks: [], used: 0 }));
    const take = (day, code, budget) => {
      let got = 0;
      const q = queue[code];
      while (q.length && got < budget - 4) {
        const it = q[0],
          room = budget - got;
        // un'attività breve non si spezza; una lunga sì, se nel giorno resta abbastanza spazio
        if (it.left <= room + 10) {
          day.tasks.push({ id: pid(it.iid, day.date), iid: it.iid, m: it.left });
          got += it.left;
          q.shift();
        } else if (room >= 20) {
          const m = r5(room);
          day.tasks.push({ id: pid(it.iid, day.date), iid: it.iid, m });
          it.left -= m;
          got += m;
        } else break;
      }
      day.used += got;
    };

    // giorni normali: ognuna delle tracce ancora da finire (studio e progetti) riceve il suo ritmo
    days.forEach((day, i) => {
      if (day.ded) return;
      const active = tracks.filter(e => e.date > day.date && remaining(e.code) > 0);
      if (!active.length) return;
      const rate = {};
      active.forEach(e => {
        const left = days.slice(i).filter(d => !d.ded && d.date < e.date).length;
        rate[e.code] = remaining(e.code) / Math.max(1, left);
      });
      const total = Object.values(rate).reduce((a, b) => a + b, 0);
      const scale = total > cap ? cap / total : 1;
      active.forEach(e =>
        take(day, e.code, Math.min(Math.max(15, rate[e.code] * scale), cap - day.used + 5))
      );
    });
    // quanto resta prima dei giorni dedicati: serve a decidere se accorciare (quei giorni sono per il ripasso)
    const beforeDed = {};
    tracks.forEach(e => (beforeDed[e.code] = remaining(e.code)));
    // nei giorni dedicati prima finisce lo studio rimasto di quell'esame, poi (dopo) il ripasso
    exams.forEach(e => days.filter(d => d.ded === e.code).forEach(d => take(d, e.code, cap - d.used)));
    const left = {};
    tracks.forEach(e => (left[e.code] = remaining(e.code)));
    return { cap, ded, shown, exams, tracks, dues, days, left, beforeDed, queue };
  }

  // giorni dedicati: ripasso dei capitoli più importanti, poi l'ultimo giorno simulazione e ripasso a memoria
  function addReviews(s, items, recap) {
    const extras = {};
    s.exams.forEach(e => {
      const mine = s.days.filter(d => d.ded === e.code);
      // solo i capitoli (non i blocchi del progetto), dai più importanti
      const topics = items
        .filter(i => i.c === e.code && i.k === "top")
        .sort((a, b) => (b.pri || 0) - (a.pri || 0));
      const quiz = (topics.find(i => i.quiz) || {}).quiz || "";
      let n = 0;
      const add = (d, o) => {
        const iid = `${e.code}.x${n++}@${d.date}`;
        extras[iid] = Object.assign({ c: e.code }, o);
        d.tasks.push({ id: pid(iid, d.date), iid, m: o.m });
        d.used += o.m;
      };
      mine.forEach((d, j) => {
        if (j === mine.length - 1) {
          const lc = Math.min(s.cap, 150) - d.used;
          if (lc < 30) return;
          add(d, {
            k: "sim",
            m: r5(lc * 0.35),
            t: "Simulazione d'esame",
            s: quiz ? "A tempo nel quiz, come se fosse l'esame" : "Esercizi o domande d'esame a tempo",
            href: quiz
          });
          add(d, {
            k: "rip",
            m: r5(lc * 0.35),
            t: "Ripassa solo gli errori",
            s: "Riapri i capitoli dove hai esitato"
          });
          add(d, {
            k: "rip",
            m: r5(lc * 0.3),
            t: "Ripasso a memoria",
            s: recap[e.code] || "I punti chiave di ogni capitolo, ad alta voce"
          });
          add(d, { k: "rest", m: 0, t: "Stacca presto e dormi bene", s: "Niente argomenti nuovi" });
        } else {
          // ripasso a blocchi di 45 minuti, dai capitoli più importanti
          for (let w = 0; s.cap - d.used >= 30 && topics.length && w < 6; w++) {
            const t = topics[(j * 6 + w) % topics.length];
            add(d, {
              k: "rip",
              m: Math.min(45, r5(s.cap - d.used)),
              t: `Ripasso: ${t.top}`,
              s: t.quiz
                ? "Rileggi le parti segnate e rifai il quiz del capitolo"
                : "Rileggi le parti segnate e ripeti a voce",
              href: t.href || ""
            });
          }
        }
      });
    });
    return extras;
  }

  // ordine dei giorni: per data; a parità di data prima lo studio, poi la consegna, poi l'esame
  const rank = d => (d.exam ? 2 : d.due ? 1 : 0);
  const byDay = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank(a) - rank(b));

  /* Il piano da `start` in poi. itemsByExam: attività con i minuti che restano.
     Restituisce i giorni, le attività (anche quelle di ripasso) e gli avvisi. */
  function generate(cfg, itemsByExam, opts) {
    const warnings = [];
    let work = itemsByExam,
      s = schedule(cfg, work, opts.start);
    /* Se per qualche esame lo studio non finisce prima dei suoi giorni di ripasso, si accorciano le sue attività
       e si riprova (al massimo 4 volte, e mai sotto metà del tempo pieno): così il ripasso resta. */
    const cutFor = new Set(),
      full = {};
    // (i progetti non si accorciano: se non ci stanno, si accorcia lo studio e, se non basta, avviso in rosso)
    s.exams.forEach(e => (full[e.code] = (work[e.code] || []).reduce((a, i) => a + i.m, 0)));
    const late = code => s.beforeDed[code] + (s.beforeDed[code + PRJ] || 0);
    for (let round = 0; round < 4 && s.exams.some(e => late(e.code) > 0); round++) {
      work = Object.assign({}, work);
      let changed = false;
      s.exams.forEach(e => {
        const need = (work[e.code] || []).reduce((a, i) => a + i.m, 0);
        const floor = full[e.code] * 0.5;
        if (late(e.code) > 0 && need > floor + 5) {
          const target = Math.max(floor, (need - late(e.code)) * 0.97);
          work[e.code] = compress(work[e.code], target / need);
          cutFor.add(e.code);
          changed = true;
        }
      });
      if (!changed) break;
      s = schedule(cfg, work, opts.start);
    }
    // se ancora non basta (pochissimi giorni): l'avanzo va nei giorni dedicati o, se non ci sono, negli ultimi giorni utili
    s.tracks.forEach(e => {
      if (!s.left[e.code]) return;
      const targets = s.days.filter(d => d.date < e.date && (d.ded === e.code || !d.ded)).slice(-2);
      s.queue[e.code].splice(0).forEach((it, k) => {
        const d = targets[k % targets.length];
        if (d) d.tasks.push({ id: pid(it.iid, d.date), iid: it.iid, m: it.left });
      });
    });
    const items = {};
    Object.values(work).forEach(list => list.forEach(i => (items[i.iid] = i)));
    const extras = addReviews(s, Object.values(items), opts.recap || {});
    // avvisi: in rosso solo quando il tempo non basta davvero; gli esami accorciati e quelli senza giorni
    // di ripasso finiscono in una nota unica (notes), per non riempire lo schermo
    const nameOf = code =>
      code.endsWith(PRJ)
        ? "Progetto di " + (opts.courseOf(code.slice(0, -PRJ.length)) || { name: code }).name
        : (opts.courseOf(code) || { name: code }).name;
    const list = names =>
      names.length > 1 ? names.slice(0, -1).join(", ") + " e " + names.slice(-1) : names[0];
    const notes = [],
      cut = [],
      noDed = [];
    s.tracks.forEach(e => {
      if (s.left[e.code] > 0)
        warnings.push(
          e.code.endsWith(PRJ)
            ? `${nameOf(e.code)}: prima della consegna non ci stanno tutte le ore (mancano circa ${fmtMin(s.left[e.code])}): le ho messe negli ultimi giorni. Aumenta le ore al giorno, aggiungi giorni di studio o anticipa l'inizio.`
            : `${nameOf(e.code)}: anche accorciando, il tempo non basta (mancano circa ${fmtMin(s.left[e.code])}). Aumenta le ore al giorno, aggiungi giorni di studio o anticipa l'inizio.`
        );
      else if (cutFor.has(e.code)) cut.push(nameOf(e.code));
      if (!e.code.endsWith(PRJ) && s.ded > 0 && !s.days.some(d => d.ded === e.code))
        noDed.push(nameOf(e.code));
    });
    if (cut.length)
      notes.push(
        `Il tempo è un po' poco per ${list(cut)}: ho tolto esercizi e domande aperte dagli argomenti meno importanti e accorciato le letture. Con più ore al giorno il piano torna completo.`
      );
    if (noDed.length)
      notes.push(
        `${list(noDed)}: niente giorni di solo ripasso, perché ${noDed.length > 1 ? "sono troppo vicini" : "è troppo vicino"} all'esame precedente.`
      );
    const days = s.days
      .filter(d => d.tasks.length)
      .map(d => ({ date: d.date, ded: d.ded, tasks: d.tasks }))
      .concat(s.shown.map(e => ({ date: e.date, exam: e.code, tasks: [] })))
      .concat(s.dues.map(e => ({ date: e.date, due: e.code, tasks: [] })))
      .sort(byDay);
    if (!s.shown.length) warnings.push("Non c'è nessun esame da oggi in poi.");
    return { days, items: Object.assign(items, extras), warnings, notes };
  }

  // attività divise per traccia (studio di un esame o suo progetto), con i minuti che restano (in ordine di studio)
  const isWork = i => i.k === "top" || i.k === "prj";
  function leftByExam(items, doneMin) {
    const out = {};
    Object.values(items).forEach(i => {
      if (!isWork(i)) return;
      const left = i.m - (doneMin[i.iid] || 0),
        tr = i.tr || i.c;
      if (left >= 5) (out[tr] = out[tr] || []).push(Object.assign({}, i, { m: left }));
    });
    return out;
  }
  // minuti già fatti di ogni attività (somma dei pezzi spuntati)
  function doneMinutes(st) {
    const out = {};
    if (!st || !st.plan) return out;
    const done = st.done || {};
    st.plan.days.forEach(d =>
      d.tasks.forEach(t => {
        if (done[t.id]) out[t.iid] = (out[t.iid] || 0) + t.m;
      })
    );
    return out;
  }
  /* Dopo ogni piano: tiene solo le attività ancora usate e le spunte che esistono ancora.
     Il totale di un'attività diventa la somma dei suoi pezzi nel calendario (fatti + da fare):
     così, se il piano l'ha accorciata, finiti i pezzi è finita davvero. */
  function tidy(st) {
    const sum = {},
      ids = new Set();
    st.plan.days.forEach(d =>
      d.tasks.forEach(t => {
        sum[t.iid] = (sum[t.iid] || 0) + t.m;
        ids.add(t.id);
      })
    );
    st.plan.items = Object.fromEntries(
      Object.entries(st.plan.items)
        .filter(([iid]) => iid in sum)
        .map(([iid, it]) => [iid, isWork(it) ? Object.assign({}, it, { m: sum[iid] }) : it])
    );
    st.done = Object.fromEntries(Object.entries(st.done || {}).filter(([id]) => ids.has(id)));
  }
  /* Nuovo calendario = pezzi già fatti (anche quelli fatti in anticipo, nei giorni futuri) + piano nuovo.
     Quelli non fatti vengono ripianificati da oggi; se due giorni hanno la stessa data, si uniscono. */
  function withDone(st, fresh) {
    const done = st.done || {};
    const isStudy = d => !d.exam && !d.due;
    const kept = st.plan.days
      .filter(isStudy)
      .map(d => ({ date: d.date, ded: d.ded || null, tasks: d.tasks.filter(x => done[x.id]) }))
      .filter(d => d.tasks.length);
    const out = fresh.map(d => Object.assign({}, d, { tasks: d.tasks.slice() }));
    kept.forEach(k => {
      const same = out.find(d => d.date === k.date && isStudy(d));
      if (same) same.tasks.unshift(...k.tasks.filter(x => !same.tasks.some(y => y.id === x.id)));
      else out.push(k);
    });
    return out.sort(byDay);
  }

  /* Costruisce (o ricostruisce) il piano. I giorni già passati restano com'erano, con le loro spunte;
     da oggi in poi si ripianifica tutto quello che manca. Serve la rete solo per leggere i piani di studio. */
  async function build(st, root) {
    const cfg = st.cfg;
    const from = cfg.start && cfg.start > today() ? cfg.start : today();
    const doneMin = doneMinutes(st);
    const fresh = {},
      recap = {},
      intro = {};
    for (const e of cfg.exams) {
      const course = courseOf(e.code);
      if (!course) continue;
      e.name = course.name; // serve ai promemoria (.github/scripts/promemoria_sessione.mjs)
      const data = await topicsOf(course, root).catch(() => null);
      if (course.piano && !data)
        throw new Error("Non riesco a leggere il piano di studio di " + course.name + ".");
      // ripasso a memoria dell'ultimo giorno: quello della prova scelta, se il piano di studio lo ha
      if (data) recap[e.code] = data.recap[e.scope || "completa"] || "";
      // consiglio: i capitoli introduttivi del corso, con il link al quaderno (non contano nel piano)
      const tips = data ? data.topics.filter(t => t.intro) : [];
      if (tips.length)
        intro[e.code] = tips.map(t => ({
          ch: t.ch,
          t: t.t,
          href: course.quaderno ? href(root, course.quaderno, t.cid) : ""
        }));
      buildItems(e, course, data, root)
        .concat(projectItems(e))
        .forEach(i => (fresh[i.iid] = i));
    }
    const g = generate(cfg, leftByExam(fresh, doneMin), { start: from, courseOf, recap });
    const old = (st.plan && st.plan.items) || {};
    const days = st.plan ? withDone(st, g.days) : g.days;
    st.plan = {
      built: Date.now(),
      start: from,
      recap,
      intro,
      items: Object.assign({}, old, fresh, g.items),
      days,
      warnings: g.warnings,
      notes: g.notes
    };
    tidy(st);
    return st;
  }

  /* ---------------- ricalcolo ---------------- */
  const isReview = iid => /\.x\d+@/.test(iid);
  // pezzi di giorni passati non spuntati, per esami non ancora fatti (il ripasso non si recupera)
  function behind(st) {
    if (!st || !st.plan) return [];
    const t = today(),
      done = st.done || {};
    // tracce ancora aperte: lo studio fino all'esame, il progetto fino alla consegna
    const open = new Set();
    st.cfg.exams.forEach(e => {
      if (e.date > t) open.add(e.code);
      if (e.prj && e.prj.on && prjDate(e) > t) open.add(e.code + PRJ);
    });
    return st.plan.days
      .filter(d => d.date < t && !d.exam && !d.due)
      .flatMap(d => d.tasks)
      .filter(x => {
        const it = st.plan.items[x.iid] || {};
        return !done[x.id] && x.m > 0 && !isReview(x.iid) && open.has(it.tr || it.c);
      });
  }
  /* Sposta da oggi in poi le attività rimaste indietro, senza rileggere i piani di studio (usa plan.items):
     funziona anche senza rete, quindi anche dalla home. Restituisce quante attività ha spostato. */
  function replanOffline(st) {
    const late = behind(st);
    if (!late.length) return 0;
    const from = today();
    const g = generate(st.cfg, leftByExam(st.plan.items, doneMinutes(st)), {
      start: from,
      courseOf,
      recap: st.plan.recap || {}
    });
    st.plan.items = Object.assign({}, st.plan.items, g.items);
    st.plan.days = withDone(st, g.days);
    st.plan.start = from;
    st.plan.warnings = g.warnings;
    st.plan.notes = g.notes;
    st.plan.replanned = { at: Date.now(), n: new Set(late.map(x => x.iid)).size };
    tidy(st);
    return st.plan.replanned.n;
  }

  /* ---------------- riepilogo ---------------- */
  // un pezzo del calendario con i testi della sua attività; "part" = parte k di n se l'attività è divisa
  function info(st, task) {
    const it = st.plan.items[task.iid] || { t: "Attività", c: "" };
    const pieces = st.plan.days.flatMap(d => d.tasks.filter(x => x.iid === task.iid));
    const part = pieces.length > 1 ? `${pieces.findIndex(x => x.id === task.id) + 1}/${pieces.length}` : "";
    return Object.assign({}, it, { id: task.id, m: task.m, part, done: !!(st.done || {})[task.id] });
  }
  function summary(st) {
    if (!st || !st.plan || !st.cfg || !st.cfg.exams.length) return null;
    const t = today(),
      done = st.done || {};
    const list = courses();
    const exams = st.cfg.exams
      .filter(e => e.date >= t)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(e =>
        Object.assign({}, e, { course: list.find(c => c.code === e.code), inDays: daysBetween(t, e.date) })
      );
    const all = st.plan.days.flatMap(d => d.tasks).filter(x => x.m > 0);
    const tot = all.reduce((a, x) => a + x.m, 0),
      fatto = all.filter(x => done[x.id]).reduce((a, x) => a + x.m, 0);
    const todayDay = st.plan.days.find(d => d.date === t && !d.exam && !d.due);
    // consegne dei progetti da oggi in poi
    const dues = st.cfg.exams
      .filter(e => e.prj && e.prj.on && prjDate(e) >= t)
      .map(e => ({
        code: e.code,
        date: prjDate(e),
        course: list.find(c => c.code === e.code),
        inDays: daysBetween(t, prjDate(e))
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const s = iso(addDays(parse(t), i));
      const ds = st.plan.days.filter(d => d.date === s);
      week.push({
        date: s,
        codes: [
          ...new Set(ds.flatMap(d => d.tasks.map(x => (st.plan.items[x.iid] || {}).c)).filter(Boolean))
        ],
        exam: (ds.find(d => d.exam) || {}).exam || null,
        due: (ds.find(d => d.due) || {}).due || null
      });
    }
    return {
      exams,
      dues,
      next: exams[0] || null,
      today: todayDay ? todayDay.tasks.map(x => info(st, x)) : [],
      todayMin: todayDay ? todayDay.tasks.reduce((a, x) => a + x.m, 0) : 0,
      pct: tot ? Math.round((100 * fatto) / tot) : 0,
      week,
      color: code => (list.find(c => c.code === code) || {}).color || "var(--ua-muted)"
    };
  }
  // spunta o toglie la spunta a un pezzo
  function toggle(st, id, on) {
    st.done = st.done || {};
    if (on) st.done[id] = true;
    else delete st.done[id];
  }

  window.SESSIONE = {
    KEY,
    LEVELS,
    WD,
    WD_LONG,
    MESI,
    courses,
    courseOf,
    load,
    save,
    clear,
    build,
    behind,
    replanOffline,
    summary,
    info,
    prjDate,
    toggle,
    topicsOf,
    iso,
    parse,
    addDays,
    today,
    daysBetween,
    fmtMin,
    fmtDay
  };
})();
