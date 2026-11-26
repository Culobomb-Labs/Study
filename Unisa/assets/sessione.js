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
     cfg:  { exams: [{ code, name, date, lv, scope, hours, chapters, prj: { on, hours, date, fromDays, fromDate, pra } }],
             start, hours, days, ded, notify, ore: [ore dei promemoria] },
     plan: { built, start, recap, sim, items: { iid: { c, k, t, top, s, m, href, quiz } },
             days: [{ date, exam?, due?, ded?, tasks: [{ id, iid, m }] }], warnings, notes,
             over: { traccia: { m, dates } } (ore messe negli ultimi giorni),
             replanned: { at, n, moved, cut, over, ded, seen } (resoconto dell'ultimo ricalcolo: vedi replanOffline),
             intro: { sigla: [{ ch, t, href }] } (capitoli introduttivi: solo consiglio),
             introV (versione dei capitoli introduttivi con cui è fatto il piano: vedi INTRO_V) },
     done: { idPezzo: true } } */
(function () {
  const KEY = "ua-sessione";
  /* Versione dei capitoli introduttivi: si aumenta di 1 quando un capitolo diventa introduttivo in un piano di studio
     ("intro": true). Le sessioni salvate con una versione più vecchia si rifanno da sole una volta, tenendo le spunte.
     1 = IS, MP e PD 00–01; 2 = anche BD 02 (23 novembre 2026). */
  const INTRO_V = 2;

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
      const piano = doc("Programma d'esame"),
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
  // legge TOPICS (e, per ogni prova, il ripasso finale "recap" e la simulazione "sim") dalla pagina del piano di studio
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
          // simulazione dell'ultimo giorno, la stessa del piano di studio (es. IS: "Seconda prova" nel quiz)
          const sim = {};
          text.replace(/(\w+): \{ topics:[\s\S]*?\n\s*sim: (\{.*\}),\s*\n/g, (_, k, o) => {
            try {
              const v = Function('"use strict"; return (' + o + ")")();
              if (v && v.t && v.s) sim[k] = { t: v.t, s: v.s };
            } catch (e) {}
          });
          return { topics, recap, sim, prove: topics.some(t => t.full) };
        })
        .catch(e => {
          delete topicCache[course.code];
          throw e;
        });
    return topicCache[course.code];
  }

  /* Esercizi dei capitoli (ESERCIZI) e tracce della simulazione dello scritto (TRACCE) dal quiz del corso,
     per "solo pratica". Sono dati scritti da noi nel quiz (oggi: esercizi in PD, tracce in PD e BD). */
  const quizCache = {};
  function quizOf(course, root) {
    if (!course.quiz) return Promise.resolve(null);
    const arr = (text, name) => {
      const m = text.match(new RegExp("const " + name + " = (\\[[\\s\\S]*?\\n\\]);"));
      return m ? Function('"use strict"; return (' + m[1] + ")")() : [];
    };
    if (!quizCache[course.code])
      quizCache[course.code] = fetch(href(root, course.quiz))
        .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
        .then(text => ({ esercizi: arr(text, "ESERCIZI"), tracce: arr(text, "TRACCE") }))
        .catch(e => {
          delete quizCache[course.code];
          throw e;
        });
    return quizCache[course.code];
  }

  /* Cosa vuoi esercitare, per ogni esame (exam.mode): "teoria", "pratica" o "entrambe".
     Le sessioni salvate prima (senza mode) valgono "entrambe", cioè come prima. */
  const MODES = [
    ["teoria", "Teoria"],
    ["pratica", "Pratica"],
    ["entrambe", "Entrambe"]
  ];
  const modeOf = exam => (exam.mode === "teoria" || exam.mode === "pratica" ? exam.mode : "entrambe");

  /* Le attività di un esame, prima di dividerle nei giorni: una per capitolo.
     Per i corsi con piano di studio: lettura + (esercizio, domanda aperta, quiz). "parts" serve a togliere gli extra
     se il tempo non basta. Per gli altri corsi: i capitoli scritti da chi studia, oppure blocchi da un'ora.
     Solo teoria: niente esercizio. Solo pratica: ripasso breve + esercizio (pr: 1, l'esercizio non si toglie mai),
     solo per i capitoli che hanno un esercizio. Se il quiz del corso ha esercizi e tracce (qz), "solo pratica" li usa:
     vedi pratica() qui sotto.
     Livello: quello dell'esame (exam.lv), oppure quello scelto per il singolo capitolo (exam.lvs[id]). */
  const lvOf = (exam, id) =>
    exam.lvs && LEVELS[exam.lvs[id]] ? exam.lvs[id] : LEVELS[exam.lv] ? exam.lv : 0;
  function buildItems(exam, course, data, root, qz) {
    const lv = exam.lv || 0,
      f = (LEVELS[lv] || LEVELS[0]).f,
      mode = modeOf(exam);
    const items = [];
    const add = (id, o) =>
      items.push(Object.assign({ iid: `${exam.code}.${id}`, c: exam.code, k: "top" }, o));
    if (data && mode === "pratica" && qz && (qz.esercizi.length || qz.tracce.length))
      return pratica(exam, course, data, root, qz, add, items);
    if (data) {
      /* I capitoli introduttivi ("intro" nel piano di studio) non entrano mai: sono solo un consiglio (plan.intro).
         IS: prima prova = argomenti senza "full"; seconda prova = quelli "full" (non c'erano nella prima) */
      const study = data.topics.filter(t => !t.intro);
      const topics = (
        exam.scope === "prima"
          ? study.filter(t => !t.full)
          : exam.scope === "seconda"
            ? study.filter(t => t.full)
            : study
      ).filter(t => mode !== "pratica" || t.draw);
      topics.forEach(t => {
        const lv = lvOf(exam, t.id),
          f = LEVELS[lv].f,
          verb = lv === 2 ? "Ripassa" : lv === 1 ? "Rileggi" : "Studia";
        let parts, o;
        if (mode === "pratica") {
          // un ripasso breve del capitolo e l'esercizio, anche se il capitolo lo sai già bene
          parts = { rev: Math.max(10, r5(t.min * f * 0.3)), draw: lv === 0 ? 25 : lv === 1 ? 20 : 15 };
          o = { t: `Esercizio: ${t.t}`, s: t.draw, pr: 1 };
        } else {
          parts = { read: Math.max(15, r5(t.min * f)) };
          if (mode === "entrambe" && lv < 2 && t.draw) parts.draw = lv === 0 ? 25 : 20;
          if (lv < 2 && t.open) parts.open = 10;
          if (course.quiz) parts.quiz = 10;
          o = { t: `${verb}: ${t.t}`, s: t.read || "" };
        }
        Object.assign(o, {
          top: t.t,
          ch: t.ch,
          pri: t.pri || 3,
          ex: t.draw || "",
          parts,
          m: Object.values(parts).reduce((a, b) => a + b, 0)
        });
        if (course.quaderno) o.href = href(root, course.quaderno, t.cid);
        // il link al quiz solo se il quiz è tra le attività; sq = quiz per la simulazione dell'ultimo giorno
        if (course.quiz) {
          if (parts.quiz) o.quiz = href(root, course.quiz);
          o.sq = href(root, course.quiz);
        }
        add(t.id, o);
      });
    } else {
      const total = Math.max(60, Math.round((exam.hours || 30) * 60 * f));
      const chapters = (exam.chapters || "")
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
      // senza piano di studio la scelta teoria/pratica cambia solo il consiglio di ogni attività
      const tip = {
        teoria: ["Leggi, fai uno schema e ripeti a voce", "Vai avanti col programma: appunti e slide"],
        pratica: [
          "Fai esercizi e tracce d'esame su questo argomento",
          "Vai avanti con esercizi e tracce d'esame del corso"
        ],
        entrambe: [
          "Leggi, fai uno schema, ripeti a voce e fai qualche esercizio",
          "Vai avanti col programma: appunti, slide ed esercizi"
        ]
      }[mode];
      if (chapters.length) {
        const m = Math.max(20, r5(total / chapters.length));
        chapters.forEach((c, i) =>
          add(`cap${i}`, {
            t: `${mode === "pratica" ? "Esercizi" : lv === 2 ? "Ripassa" : "Studia"}: ${c}`,
            top: c,
            s: tip[0],
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
            s: tip[1],
            pri: 3,
            parts: { read: m },
            m
          });
        }
      }
    }
    return items;
  }

  /* "Solo pratica" con il quiz del corso, in quest'ordine:
     1. gli esercizi guidati dei capitoli (ESERCIZI, senza quelli di teoria): per ogni capitolo che ne ha, un ripasso
        breve e i suoi esercizi, ognuno con i suoi minuti e il link che lo apre (#es-<id>). I capitoli senza esercizi
        non entrano; se il quiz non ha esercizi, si usa l'esercizio tipo del programma (draw);
     2. la preparazione completa: le tracce dello scritto solo sulla parte pratica (#trp-<id>, 5 minuti a punto), la
        prima quando resta circa il 15% degli esercizi, le altre dopo, con in mezzo "Rifai gli esercizi sbagliati".
     Tutto con pr: 1 (non si toglie quando il tempo è poco, si accorcia soltanto). */
  function pratica(exam, course, data, root, qz, add, items) {
    const study = data.topics.filter(t => !t.intro);
    const topics =
      exam.scope === "prima"
        ? study.filter(t => !t.full)
        : exam.scope === "seconda"
          ? study.filter(t => t.full)
          : study;
    const quiz = hash => href(root, course.quiz, hash);
    const ex = qz.esercizi.filter(x => !x.teoria);
    topics.forEach(t => {
      const lv = lvOf(exam, t.id),
        mine = ex.filter(x => x.c === t.cid);
      if (ex.length && !mine.length) return;
      if (!ex.length && !t.draw) return;
      const rev = Math.max(10, r5(t.min * LEVELS[lv].f * 0.3));
      const base = {
        top: t.t,
        ch: t.ch,
        pri: t.pri || 3,
        ex: t.draw || "",
        pr: 1,
        href: course.quaderno ? href(root, course.quaderno, t.cid) : "",
        sq: quiz()
      };
      if (!mine.length) {
        const parts = { rev, draw: lv === 0 ? 25 : lv === 1 ? 20 : 15 };
        add(t.id, Object.assign({ t: `Esercizio: ${t.t}`, s: t.draw, parts, m: rev + parts.draw }, base));
        return;
      }
      // un'attività per esercizio (si fa tutta in un giorno: whole); il ripasso breve va con il primo
      mine.forEach((x, j) => {
        const parts = j ? { es: x.min } : { rev, es: x.min };
        add(
          `${t.id}.${x.id}`,
          Object.assign({}, base, {
            t: `Esercizio guidato: ${x.t}`,
            s: `${t.ch} · ${t.t}${j ? "" : " · prima un ripasso breve del capitolo"}`,
            es: 1,
            whole: 1,
            parts,
            m: Object.values(parts).reduce((a, b) => a + b, 0),
            quiz: quiz("es-" + x.id)
          })
        );
      });
    });
    // preparazione completa: tracce solo sulla parte pratica, e tra una e l'altra gli esercizi sbagliati
    const tr = qz.tracce.map((x, i) => {
      const pp = x.es.filter(e => !e.teoria),
        pts = pp.reduce((a, e) => a + e.punti, 0);
      return {
        iid: `${exam.code}.tr${i}`,
        c: exam.code,
        k: "top",
        t: `Simulazione · solo parte pratica: ${x.titolo}`,
        s: `Nel quiz, a tempo come all’esame: ${pp.length} parti, ${pts} punti. Poi rivedi le parti dove hai perso punti.`,
        top: x.titolo,
        pri: 5,
        pr: 1,
        trc: 1, // traccia della simulazione (tr è il nome della traccia del piano: studio, progetto…)
        whole: 1,
        parts: { sim: r5(pts * 5) },
        m: r5(pts * 5),
        quiz: quiz("trp-" + x.id),
        sq: quiz()
      };
    });
    const redo = i => ({
      iid: `${exam.code}.rifai${i}`,
      c: exam.code,
      k: "top",
      t: "Rifai gli esercizi sbagliati",
      s: "Nel quiz, quelli che hai segnato Sbagliato o Parzialmente giusto, senza guida",
      top: "esercizi sbagliati",
      pri: 4,
      pr: 1,
      redo: 1,
      parts: { es: 45 },
      m: 45,
      quiz: quiz(),
      sq: quiz()
    });
    if (!tr.length) return items;
    // la prima traccia quando gli esercizi sono quasi finiti (circa l'ultimo 15% dei minuti)
    const tot = items.reduce((a, i) => a + i.m, 0);
    let acc = 0,
      at = items.length;
    for (let i = 0; i < items.length; i++) {
      acc += items[i].m;
      if (acc >= tot * 0.85) {
        at = i + 1;
        break;
      }
    }
    const rest = tr.slice(1).flatMap((x, i) => (ex.length ? [redo(i), x] : [x]));
    return items.slice(0, at).concat(tr[0], items.slice(at), rest);
  }

  /* Il progetto di un esame (se c'è): blocchi da un'ora fino alla consegna, su una traccia a parte
     (tr = "<sigla>#prj"), così va in parallelo allo studio e non si accorcia mai di nascosto.
     Se la traccia arriva più tardi (prj.fromDate o prj.fromDays, es. BD o PD), i blocchi partono da quel giorno
     e prima ci sono blocchi di esercizio sulla parte pratica (prj.pra ore, traccia "<sigla>#pra"). */
  const PRJ = "#prj",
    PRA = "#pra";
  const prjDate = e => (e.prj && e.prj.date) || e.date;
  /* giorno in cui arriva la traccia del progetto (null = c'è già): un giorno preciso (prj.fromDate,
     es. BD) oppure tot giorni prima dell'esame (prj.fromDays, es. PD). Vale solo se è prima della consegna. */
  const prjFrom = e => {
    const p = e.prj;
    if (!p || !p.on) return null;
    const d = p.fromDate || (p.fromDays > 0 ? iso(addDays(parse(e.date), -p.fromDays)) : null);
    return d && d < prjDate(e) ? d : null;
  };
  // true se il giorno della traccia è preciso (non "circa")
  const prjFromExact = e => !!(prjFrom(e) && e.prj.fromDate);
  const blocks = (exam, kind, hours, t, s) => {
    const total = Math.round(hours * 60),
      n = Math.ceil(total / 60);
    const out = [];
    for (let i = 0; i < n; i++) {
      const m = i === n - 1 ? total - 60 * (n - 1) || 60 : 60;
      out.push({
        iid: `${exam.code}.${kind}${i}`,
        c: exam.code,
        tr: exam.code + "#" + kind,
        k: kind,
        t: `${t} · blocco ${i + 1} di ${n}`,
        top: `${t.toLowerCase()}, blocco ${i + 1}`,
        s,
        pri: 3,
        parts: { read: m },
        m
      });
    }
    return out;
  };
  function projectItems(exam) {
    const p = exam.prj;
    if (!p || !p.on || !(p.hours > 0)) return [];
    const out = blocks(
      exam,
      "prj",
      p.hours,
      "Progetto",
      "Avanza col progetto: codice, documentazione e prove"
    );
    if (prjFrom(exam) && p.pra > 0)
      out.push(
        ...blocks(
          exam,
          "pra",
          p.pra,
          "Esercizio pratico",
          "La traccia del progetto non c'è ancora: esercitati sulla parte pratica (programmi d'esempio del corso)"
        )
      );
    return out;
  }

  /* se il tempo non basta: 1) via esercizio e domanda aperta dagli argomenti meno importanti
     (in "solo pratica", pr, l'esercizio resta), 2) si accorcia tutto */
  function compress(items, ratio) {
    const out = items.map(i => Object.assign({}, i, { parts: Object.assign({}, i.parts) }));
    const need = () => out.reduce((a, i) => a + i.m, 0);
    const target = need() * ratio;
    const order = out.filter(i => !i.pr && (i.parts.draw || i.parts.open)).sort((a, b) => a.pri - b.pri);
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
    // giorni con meno tempo (cfg.off): "Niente studio" toglie il giorno, "Mezza giornata" dà metà delle ore
    const off = {};
    (cfg.off || []).forEach(o => (off[o.date] = o.half ? r5(cap / 2) : 0));
    const capOf = s => (s in off ? off[s] : cap);
    const ded = Math.max(0, cfg.ded == null ? 2 : cfg.ded);
    const byDateAsc = (a, b) => (a.date < b.date ? -1 : 1);
    // l'esame di oggi resta nel calendario, ma per lui non si studia più
    const shown = cfg.exams.filter(e => e.date >= start).sort(byDateAsc);
    const exams = shown.filter(e => e.date > start);
    /* le tracce: lo studio di ogni esame (scadenza: l'esame), i progetti (dal giorno della traccia alla consegna)
       e l'esercizio pratico prima della traccia (scadenza: il giorno della traccia). from = da quando si può fare. */
    const has = code => (itemsByExam[code] || []).length;
    const projects = cfg.exams
      .filter(e => e.prj && e.prj.on && has(e.code + PRJ) && prjDate(e) > start)
      .map(e => ({ code: e.code + PRJ, exam: e.code, date: prjDate(e), from: prjFrom(e) }));
    const practice = cfg.exams
      .filter(e => prjFrom(e) && has(e.code + PRA) && prjFrom(e) > start)
      .map(e => ({ code: e.code + PRA, exam: e.code, date: prjFrom(e) }));
    const tracks = exams.map(e => ({ code: e.code, exam: e.code, date: e.date })).concat(projects, practice);
    // un giorno va bene per una traccia se è prima della scadenza e da quando si può fare
    const fits = (e, d) => d.date < e.date && (!e.from || d.date >= e.from);
    const dues = cfg.exams
      .filter(e => e.prj && e.prj.on && prjDate(e) >= start)
      .map(e => ({ code: e.code, date: prjDate(e) }));
    const examDates = new Set(exams.map(e => e.date));
    const last = tracks.reduce((a, t) => (t.date > a ? t.date : a), start);

    // giorni in cui si studia (non quelli degli esami)
    const study = [];
    for (let d = parse(start); iso(d) < last; d = addDays(d, 1)) {
      const s = iso(d);
      if (cfg.days.includes(d.getDay()) && !examDates.has(s) && capOf(s) > 0) study.push(s);
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
    /* whole: un esercizio guidato o la simulazione di una traccia si fa tutto in un giorno (la simulazione a tempo,
       come all'esame), anche se va un po' oltre il ritmo del giorno */
    tracks.forEach(
      e =>
        (queue[e.code] = (itemsByExam[e.code] || []).map(i => ({ iid: i.iid, left: i.m, whole: !!i.whole })))
    );
    const remaining = code => queue[code].reduce((a, i) => a + i.left, 0);
    const days = study.map(s => ({ date: s, ded: dedOf[s] || null, tasks: [], used: 0, cap: capOf(s) }));
    const take = (day, code, budget) => {
      let got = 0;
      const q = queue[code];
      while (q.length && got < budget - 4) {
        const it = q[0],
          room = budget - got;
        if (it.whole) {
          // tutta oggi, se nella giornata c'è posto; altrimenti un altro giorno
          if (it.left > day.cap - day.used - got + 10) break;
          day.tasks.push({ id: pid(it.iid, day.date), iid: it.iid, m: it.left });
          got += it.left;
          q.shift();
          continue;
        }
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
      const active = tracks.filter(e => fits(e, day) && remaining(e.code) > 0);
      if (!active.length) return;
      const rate = {};
      active.forEach(e => {
        const left = days.slice(i).filter(d => !d.ded && fits(e, d)).length;
        rate[e.code] = remaining(e.code) / Math.max(1, left);
      });
      const total = Object.values(rate).reduce((a, b) => a + b, 0);
      const scale = total > day.cap ? day.cap / total : 1;
      active.forEach(e =>
        take(day, e.code, Math.min(Math.max(15, rate[e.code] * scale), day.cap - day.used + 5))
      );
    });
    // quanto resta prima dei giorni dedicati: serve a decidere se accorciare (quei giorni sono per il ripasso)
    const beforeDed = {};
    tracks.forEach(e => (beforeDed[e.code] = remaining(e.code)));
    // nei giorni dedicati prima finisce lo studio rimasto di quell'esame, poi il suo progetto (se la traccia
    // c'è già e non è scaduto), poi (dopo) il ripasso
    exams.forEach(e =>
      days
        .filter(d => d.ded === e.code)
        .forEach(d => {
          take(d, e.code, d.cap - d.used);
          const prj = projects.find(x => x.exam === e.code);
          if (prj && fits(prj, d)) take(d, prj.code, d.cap - d.used);
        })
    );
    // per i progetti conta quello che resta anche dopo i giorni dedicati (lì il progetto può andare)
    projects.forEach(e => (beforeDed[e.code] = remaining(e.code)));
    const left = {};
    tracks.forEach(e => (left[e.code] = remaining(e.code)));
    return { cap, ded, shown, exams, tracks, dues, days, left, beforeDed, queue, fits };
  }

  // giorni dedicati: ripasso dei capitoli più importanti, poi l'ultimo giorno simulazione e ripasso a memoria
  function addReviews(s, items, recap, sims) {
    const extras = {};
    s.exams.forEach(e => {
      const mine = s.days.filter(d => d.ded === e.code);
      // solo i capitoli (non i blocchi del progetto), dai più importanti
      const topics = items
        .filter(i => i.c === e.code && i.k === "top" && !i.trc && !i.redo)
        // un capitolo una volta sola (in "solo pratica" ci sono più esercizi per capitolo)
        .filter((i, k, all) => all.findIndex(x => x.top === i.top) === k)
        .sort((a, b) => (b.pri || 0) - (a.pri || 0));
      // il quiz per la simulazione c'è anche in "solo pratica" (sq); i piani salvati prima hanno solo quiz
      const qi = topics.find(i => i.sq || i.quiz) || {};
      const quiz = qi.sq || qi.quiz || "";
      let n = 0;
      const add = (d, o) => {
        const iid = `${e.code}.x${n++}@${d.date}`;
        extras[iid] = Object.assign({ c: e.code }, o);
        d.tasks.push({ id: pid(iid, d.date), iid, m: o.m });
        d.used += o.m;
      };
      mine.forEach((d, j) => {
        if (j === mine.length - 1) {
          const lc = Math.min(d.cap, 150) - d.used;
          if (lc < 30) return;
          add(d, {
            k: "sim",
            m: r5(lc * 0.35),
            t: sims[e.code] ? sims[e.code].t : "Simulazione d'esame",
            s: sims[e.code]
              ? sims[e.code].s
              : quiz
                ? "A tempo nel quiz, come se fosse l'esame"
                : "Esercizi o domande d'esame a tempo",
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
          for (let w = 0; d.cap - d.used >= 30 && topics.length && w < 6; w++) {
            const t = topics[(j * 6 + w) % topics.length];
            add(d, {
              k: "rip",
              m: Math.min(45, r5(d.cap - d.used)),
              t: `Ripasso: ${t.top}`,
              s: t.es
                ? "Rifai gli esercizi del capitolo senza guida"
                : t.pr
                  ? "Rifai l'esercizio del capitolo senza guardare la soluzione"
                  : t.quiz
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
    /* se ancora non basta (pochissimi giorni): l'avanzo va nei giorni dedicati o, se non ci sono, negli ultimi giorni
       utili. In `over` restano, per traccia, i minuti messi lì e i giorni (servono al resoconto del ricalcolo). */
    const over = {};
    s.tracks.forEach(e => {
      if (!s.left[e.code]) return;
      const targets = s.days.filter(d => s.fits(e, d) && (!d.ded || d.ded === e.exam)).slice(-2);
      const used = new Set();
      s.queue[e.code].splice(0).forEach((it, k) => {
        const d = targets[k % targets.length];
        if (!d) return;
        d.tasks.push({ id: pid(it.iid, d.date), iid: it.iid, m: it.left });
        used.add(d.date);
      });
      if (used.size) over[e.code] = { m: s.left[e.code], dates: [...used].sort() };
    });
    const items = {};
    Object.values(work).forEach(list => list.forEach(i => (items[i.iid] = i)));
    const extras = addReviews(s, Object.values(items), opts.recap || {}, opts.sim || {});
    // avvisi: in rosso solo quando il tempo non basta davvero; gli esami accorciati e quelli senza giorni
    // di ripasso finiscono in una nota unica (notes), per non riempire lo schermo
    const courseName = code => (opts.courseOf(code) || { name: code }).name;
    const nameOf = code =>
      code.endsWith(PRJ)
        ? "Progetto di " + courseName(code.slice(0, -PRJ.length))
        : code.endsWith(PRA)
          ? "Esercizio pratico di " + courseName(code.slice(0, -PRA.length))
          : courseName(code);
    const list = names =>
      names.length > 1 ? names.slice(0, -1).join(", ") + " e " + names.slice(-1) : names[0];
    const notes = [],
      cut = [],
      noDed = [];
    s.tracks.forEach(e => {
      if (s.left[e.code] > 0)
        warnings.push(
          e.code.endsWith(PRJ)
            ? `${nameOf(e.code)}: ${e.from ? "tra l'arrivo della traccia e la consegna" : "prima della consegna"} non ci stanno tutte le ore (mancano circa ${fmtMin(s.left[e.code])}): le ho messe negli ultimi giorni. Aumenta le ore al giorno${e.from ? " o riduci le ore del progetto" : ", aggiungi giorni di studio o anticipa l'inizio"}.`
            : e.code.endsWith(PRA)
              ? `${nameOf(e.code)}: prima che arrivi la traccia non ci stanno tutte le ore (mancano circa ${fmtMin(s.left[e.code])}). Riduci le ore di esercizio o aumenta le ore al giorno.`
              : `${nameOf(e.code)}: anche accorciando, il tempo non basta (mancano circa ${fmtMin(s.left[e.code])}). Aumenta le ore al giorno, aggiungi giorni di studio o anticipa l'inizio.`
        );
      else if (cutFor.has(e.code)) cut.push(nameOf(e.code));
      if (!e.code.includes("#") && s.ded > 0 && !s.days.some(d => d.ded === e.code))
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
    return { days, items: Object.assign(items, extras), warnings, notes, over };
  }

  // attività divise per traccia (studio di un esame o suo progetto), con i minuti che restano (in ordine di studio)
  const isWork = i => i.k === "top" || i.k === "prj" || i.k === "pra";
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
      sim = {},
      intro = {};
    for (const e of cfg.exams) {
      const course = courseOf(e.code);
      if (!course) continue;
      e.name = course.name; // serve ai promemoria (.github/scripts/promemoria_sessione.mjs)
      const data = await topicsOf(course, root).catch(() => null);
      if (course.piano && !data)
        throw new Error("Non riesco a leggere il programma d'esame di " + course.name + ".");
      // ripasso a memoria dell'ultimo giorno: quello della prova scelta, se il piano di studio lo ha
      if (data) recap[e.code] = data.recap[e.scope || "completa"] || "";
      // simulazione dell'ultimo giorno: quella della prova scelta, se il piano di studio la ha
      if (data && data.sim && data.sim[e.scope || "completa"]) sim[e.code] = data.sim[e.scope || "completa"];
      // consiglio: i capitoli introduttivi del corso, con il link al quaderno (non contano nel piano)
      const tips = data ? data.topics.filter(t => t.intro) : [];
      if (tips.length)
        intro[e.code] = tips.map(t => ({
          ch: t.ch,
          t: t.t,
          href: course.quaderno ? href(root, course.quaderno, t.cid) : ""
        }));
      // "solo pratica": esercizi e tracce dal quiz del corso (senza rete si usa l'esercizio tipo del programma)
      const qz = modeOf(e) === "pratica" ? await quizOf(course, root).catch(() => null) : null;
      if (qz && qz.tracce.length)
        sim[e.code] = {
          t: "Simulazione · solo parte pratica",
          s: "Nel quiz: una traccia dello scritto, solo la parte pratica, a tempo come all’esame. Poi rivedi le parti dove hai perso punti."
        };
      buildItems(e, course, data, root, qz)
        .concat(projectItems(e))
        .forEach(i => (fresh[i.iid] = i));
    }
    const g = generate(cfg, leftByExam(fresh, doneMin), { start: from, courseOf, recap, sim });
    const old = (st.plan && st.plan.items) || {};
    const days = st.plan ? withDone(st, g.days) : g.days;
    st.plan = {
      built: Date.now(),
      start: from,
      recap,
      sim,
      intro,
      introV: INTRO_V,
      items: Object.assign({}, old, fresh, g.items),
      days,
      warnings: g.warnings,
      notes: g.notes,
      over: g.over
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
      if (prjFrom(e) && prjFrom(e) > t) open.add(e.code + PRA);
    });
    return st.plan.days
      .filter(d => d.date < t && !d.exam && !d.due)
      .flatMap(d => d.tasks)
      .filter(x => {
        const it = st.plan.items[x.iid] || {};
        return !done[x.id] && x.m > 0 && !isReview(x.iid) && open.has(it.tr || it.c);
      });
  }
  // giorni di solo ripasso (dedicati a un esame e senza studio né progetto) da `from` in poi, per esame
  function pureDed(plan, from) {
    const out = {};
    plan.days.forEach(d => {
      if (!d.ded || d.date < from) return;
      out[d.ded] = out[d.ded] || 0;
      if (!d.tasks.some(x => isWork(plan.items[x.iid] || {}))) out[d.ded]++;
    });
    return out;
  }
  // nome breve di un'attività nel resoconto: "05 · Requisiti" per i capitoli, "Progetto · blocco 3 di 20" per il resto
  const shortName = it =>
    it.k === "top" ? `${it.ch ? it.ch + " · " : ""}${it.top || it.t}` : it.t || "Attività";

  /* Sposta da oggi in poi le attività rimaste indietro, senza rileggere i piani di studio (usa plan.items):
     funziona anche senza rete, quindi anche dalla home. Restituisce quante attività ha spostato.
     In plan.replanned resta il resoconto di cosa è cambiato (lo mostrano la pagina e la home finché non si chiude):
     moved = attività spostate e i giorni in cui sono finite; cut = attività accorciate; over = ore messe negli ultimi
     giorni (solo se sono aumentate); ded = esami con meno giorni di solo ripasso; seen = resoconto chiuso. */
  function replanOffline(st) {
    const late = behind(st);
    if (!late.length) return 0;
    const from = today();
    const doneMin = doneMinutes(st);
    // com'era prima: minuti che restano di ogni attività, giorni di solo ripasso e ore negli ultimi giorni
    const before = {};
    Object.values(leftByExam(st.plan.items, doneMin)).forEach(list => list.forEach(i => (before[i.iid] = i)));
    const dedBefore = pureDed(st.plan, from);
    const overBefore = st.plan.over || {};
    const g = generate(st.cfg, leftByExam(st.plan.items, doneMin), {
      start: from,
      courseOf,
      recap: st.plan.recap || {},
      sim: st.plan.sim || {}
    });
    st.plan.items = Object.assign({}, st.plan.items, g.items);
    st.plan.days = withDone(st, g.days);
    st.plan.start = from;
    st.plan.warnings = g.warnings;
    st.plan.notes = g.notes;
    st.plan.over = g.over;
    tidy(st);

    const done = st.done || {};
    const ahead = st.plan.days.filter(d => d.date >= from && !d.exam && !d.due);
    const datesOf = iid => [
      ...new Set(ahead.filter(d => d.tasks.some(x => x.iid === iid && !done[x.id])).map(d => d.date))
    ];
    // i capitoli uno per uno; i blocchi di progetto ed esercizio pratico in una riga sola per traccia (ore e giorni)
    const KIND = { prj: "Progetto", pra: "Esercizio pratico" };
    const moved = [],
      byTrack = {};
    [...new Set(late.map(x => x.iid))].forEach(iid => {
      const it = st.plan.items[iid] || before[iid] || {};
      if (!KIND[it.k]) return moved.push({ c: it.c || "", t: shortName(it), dates: datesOf(iid) });
      const g = (byTrack[it.tr] = byTrack[it.tr] || { c: it.c || "", k: it.k, m: 0, n: 0, dates: [] });
      g.m += late.filter(x => x.iid === iid).reduce((a, x) => a + x.m, 0);
      g.n++;
      g.dates = [...new Set(g.dates.concat(datesOf(iid)))].sort();
    });
    Object.values(byTrack).forEach(g =>
      moved.push({ c: g.c, t: `${KIND[g.k]}: ${fmtMin(g.m)}`, dates: g.dates, n: g.n })
    );
    const cut = [];
    Object.values(before).forEach(b => {
      const ni = g.items[b.iid];
      if (!ni || b.k !== "top") return;
      const drop = ["draw", "open"].filter(p => b.parts[p] && !(ni.parts || {})[p]);
      const dropMin = drop.reduce((a, p) => a + b.parts[p], 0);
      const short = ni.m < b.m - dropMin - 5;
      if (drop.length || short)
        cut.push({ c: b.c, ch: b.ch || b.top || "", drop, from: b.m, to: ni.m, short });
    });
    const over = Object.entries(g.over)
      .filter(([code, o]) => o.m > ((overBefore[code] || {}).m || 0) + 5)
      .map(([code, o]) => ({
        c: code.split("#")[0],
        k: code.split("#")[1] || "top",
        m: o.m,
        dates: o.dates
      }));
    const dedAfter = pureDed(st.plan, from);
    const ded = Object.entries(dedBefore)
      .filter(([code, n]) => (dedAfter[code] || 0) < n)
      .map(([code, n]) => ({ c: code, n: dedAfter[code] || 0, was: n }));
    const n = moved.reduce((a, x) => a + (x.n || 1), 0);
    st.plan.replanned = { at: Date.now(), n, moved, cut, over, ded, seen: false };
    return n;
  }

  /* Il resoconto dell'ultimo ricalcolo, pronto da mostrare: { sum, groups: [{ h, rows: [{ c, t, x, d }] }] }
     (c = sigla del corso, t = attività, x = cosa è cambiato, d = capitoli coinvolti). null se non c'è o se è già
     stato chiuso. I capitoli accorciati sono raggruppati per corso, così la lista resta corta.
     I resoconti salvati prima (solo { at, n }) restano visibili 3 giorni, come prima, senza dettagli. */
  function report(st) {
    const rp = st && st.plan && st.plan.replanned;
    if (!rp || rp.seen || !rp.n) return null;
    if (!rp.moved && Date.now() - rp.at > 3 * 86400000) return null;
    const t = today(),
      tomorrow = iso(addDays(parse(t), 1));
    const day = d => (d === t ? "oggi" : d === tomorrow ? "domani" : fmtDay(d));
    const days = ds => (ds && ds.length ? "→ " + ds.map(day).join(", ") : "");
    const KIND = { prj: "Progetto", pra: "Esercizio pratico", top: "Studio" };
    const DROP = { draw: "esercizio", open: "domanda aperta" };
    const chapters = n => (n === 1 ? "1 capitolo" : `${n} capitoli`);
    // capitoli accorciati, per corso: una riga per quelli senza esercizio/domanda aperta, una per quelli più brevi
    const cutRows = [];
    [...new Set((rp.cut || []).map(x => x.c))].forEach(c => {
      const mine = rp.cut.filter(x => x.c === c);
      const drop = mine.filter(x => x.drop.length),
        short = mine.filter(x => x.short);
      if (drop.length) {
        const parts = [...new Set(drop.flatMap(x => x.drop))].map(p => DROP[p]);
        cutRows.push({ c, t: `${chapters(drop.length)} senza ${parts.join(" e ")}`, d: drop.map(x => x.ch) });
      }
      if (short.length)
        cutRows.push({
          c,
          t: `${chapters(short.length)} più ${short.length === 1 ? "breve" : "brevi"}`,
          x: `${fmtMin(short.reduce((a, x) => a + x.to, 0))} invece di ${fmtMin(short.reduce((a, x) => a + x.from, 0))}`,
          d: short.map(x => x.ch)
        });
    });
    // numeri dei capitoli, senza ripetizioni (in alcuni corsi più argomenti stanno nello stesso capitolo)
    cutRows.forEach(r => (r.d = [...new Set(r.d.filter(Boolean))].join(", ")));
    const groups = [
      { h: "Spostate", rows: (rp.moved || []).map(x => ({ c: x.c, t: x.t, x: days(x.dates) })) },
      { h: "Più brevi", rows: cutRows },
      {
        h: "Negli ultimi giorni",
        rows: (rp.over || []).map(x => ({
          c: x.c,
          t: `${KIND[x.k] || "Studio"}: ${fmtMin(x.m)}`,
          x: days(x.dates)
        }))
      },
      {
        h: "Giorni di solo ripasso",
        rows: (rp.ded || []).map(x => ({
          c: x.c,
          t: "",
          x: x.n ? `${x.n} invece di ${x.was}` : `nessuno (prima ${x.was})`
        }))
      }
    ].filter(g => g.rows.length);
    const what = rp.n === 1 ? "1 attività rimasta indietro" : `${rp.n} attività rimaste indietro`;
    const more = groups.some(g => g.h !== "Spostate") ? " e adattato il piano" : "";
    return { sum: `Ho spostato da oggi in poi ${what}${more}.`, groups };
  }
  // chiude il resoconto (non ricompare finché non c'è un nuovo ricalcolo)
  function closeReport(st) {
    if (st && st.plan && st.plan.replanned) st.plan.replanned.seen = true;
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
    INTRO_V,
    LEVELS,
    MODES,
    modeOf,
    lvOf,
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
    report,
    closeReport,
    summary,
    info,
    prjDate,
    prjFrom,
    prjFromExact,
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
