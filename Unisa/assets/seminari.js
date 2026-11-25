/* Calendario dei seminari di Accompagnamento al lavoro (orientamento in uscita), dalle locandine.
   È l'unico posto da modificare quando esce un seminario nuovo: lo usano il calendario del quaderno
   (Accompagnamento al lavoro/Quaderno di Accompagnamento al lavoro.html) e la scheda AL della home.
   - d: data, AAAA-MM-GG
   - p: "pari" | "dispari" | "tutti" (parità delle matricole che possono firmare)
   - t: titolo, come sulla locandina
   - w: orario e aula
   - img: locandina, a partire dalla cartella "Accompagnamento al lavoro" (es. img/2026-11-25-ey.jpg);
     vuota se non c'è
   - x: 1 per gli eventi fuori dai turni pari/dispari, dove non si firma (es. il Career Lab)
   Le voci vanno in ordine di data. */
window.SEMINARI = [
  { d: "2026-09-23", p: "pari", t: "Inizio dei seminari: la prima metà degli errori nello scrivere il CV", w: "13:30–15:30 · Aula P1, Edificio F3", img: "img/2026-09-23-cv.jpg" },
  { d: "2026-09-30", p: "dispari", t: "Inizio dei seminari: la prima metà degli errori nello scrivere il CV", w: "Stesso seminario, per le matricole dispari (data dalle slide)", img: "" },
  { d: "2026-10-08", p: "tutti", t: "Career Lab con Manpower", w: "9:00–13:00 · Aula delle Lauree di Ingegneria V. Cardone (Ed. E1) · evento del DIIn per laureandi e neolaureati, fuori dai turni pari/dispari", img: "img/2026-10-08-career-lab.jpg", x: 1 },
  { d: "2026-10-14", p: "pari", t: "Poste Italiane · Costruire il futuro: AI, Computer Vision e innovazione", w: "13:30–15:30 · Aula P3, Ed. F3", img: "img/2026-10-14-poste-italiane.jpg" },
  { d: "2026-10-21", p: "dispari", t: "JET Company · Costruire un hub del software al Sud", w: "13:30–15:30 · Aula P01027, Ed. F4", img: "img/2026-10-21-jet-company.jpg" },
  { d: "2026-11-04", p: "pari", t: "Il Placement UNISA per i futuri professionisti IT", w: "13:30–15:30 · Aula P1, Ed. F3", img: "img/2026-11-04-placement-unisa.jpg" },
  { d: "2026-11-11", p: "dispari", t: "Regione Campania · Lavorare nel digitale pubblico", w: "13:30–15:30 · Aula P1, Ed. F3", img: "img/2026-11-11-regione-campania.jpg" },
  { d: "2026-11-18", p: "pari", t: "Accenture · How AI reshaped the way we work", w: "13:30–15:30 · Aula P1, Ed. F3", img: "img/2026-11-18-accenture.jpg" },
  { d: "2026-11-25", p: "dispari", t: "EY Meets Università di Salerno, Dipartimento di Informatica", w: "13:30–15:30 · Aula P1, Ed. F3", img: "img/2026-11-25-ey.jpg" }
];

/* Le firme dei seminari, condivise da calendario e home.
   La parità scelta (Profilo o calendario) è in "al-matricola" ("pari" | "dispari"; assente = non scelta),
   le spunte "Ho firmato" in "al-firme" ({ "AAAA-MM-GG": true }). Con l'accesso Google si sincronizzano
   su tutti i dispositivi (vedi site.js). */
window.SEMINARI_FIRME = (function () {
  const PK = "al-matricola",
    FK = "al-firme";
  const read = k => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const parita = () => {
    const p = read(PK);
    return p === "pari" || p === "dispari" ? p : null;
  };
  const firme = () => {
    try {
      return JSON.parse(read(FK) || "{}") || {};
    } catch (e) {
      return {};
    }
  };
  const oggi = () => {
    const n = new Date();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  };
  /* stato per la home: firme messe sui seminari della propria parità (tutti quelli in calendario,
     anche futuri), e il primo seminario di oggi o dei prossimi giorni */
  function stato() {
    const p = parita(),
      f = firme(),
      t = oggi();
    const miei = p ? window.SEMINARI.filter(s => !s.x && s.p === p) : [];
    return {
      parita: p,
      firmate: miei.filter(s => f[s.d] === true).length,
      totale: miei.length,
      qualcuna: Object.values(f).some(v => v === true),
      prossimo: miei.find(s => s.d >= t) || null,
      oggi: t
    };
  }
  return { PK, FK, parita, firme, stato };
})();
