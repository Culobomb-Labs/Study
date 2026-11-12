/* Elenco dei corsi del sito. È l'unico posto da modificare quando aggiungi materiale.
   - path: percorso del file a partire dalla cartella Unisa (gli spazi vanno bene)
   - color: is | mp | pd | so | bd | ... (i colori sono in assets/site.css, variabili --ua-c-...)
   - stato: "aggiornato" (appunti completi e aggiornati), "in-aggiornamento" (appunti ancora in lavorazione)
     oppure "in-arrivo" (corso aggiunto, appunti non ancora caricati: "docs" può restare vuoto, cioè [])
   - resto (facoltativo): il canale del corso a cui si riferiscono gli appunti, es. "1" per Resto 1
   - progressKey (facoltativo): la chiave con cui la pagina salva le spunte nel browser;
     serve alla home per mostrare l'avanzamento ("4/18 capitoli fatti")
   Il contenuto tra le due righe CORSI deve restare JSON valido (virgolette doppie, niente virgole finali):
   lo legge anche lo script di pubblicazione per costruire la ricerca. */
window.CORSI =
/* CORSI-INIZIO */
[
  {
    "code": "IS",
    "resto": "1",
    "name": "Ingegneria del Software",
    "meta": "3° anno",
    "stato": "aggiornato",
    "color": "is",
    "docs": [
      { "name": "Quaderno di Ingegneria del Software", "kind": "Quaderno", "path": "Ingenieria del Software/Quaderno di Ingegneria del Software.html", "progressKey": "quaderno-ingsw-done" },
      { "name": "Piano di studio: prima prova, seconda prova o esame completo", "kind": "Piano di studio", "path": "Ingenieria del Software/Piano di studio IS.html", "progressKey": "piano-intercorso-ingsw" },
      { "name": "Quiz, capitoli 01–19", "kind": "Quiz", "path": "Ingenieria del Software/Quiz IS.html" }
    ]
  },
  {
    "code": "MP",
    "name": "Mobile Programming",
    "meta": "3° anno · Android",
    "stato": "aggiornato",
    "color": "mp",
    "docs": [
      { "name": "Quaderno di Android", "kind": "Quaderno", "path": "Mobile Programming/Quaderno di Android.html", "progressKey": "quaderno-android-done" },
      { "name": "Piano di studio per l'esame", "kind": "Piano di studio", "path": "Mobile Programming/Piano di studio MP.html", "progressKey": "piano-esame-mp" },
      { "name": "Quiz, capitoli 01–21", "kind": "Quiz", "path": "Mobile Programming/Quiz MP.html" }
    ]
  },
  {
    "code": "PD",
    "resto": "1",
    "name": "Programmazione Distribuita",
    "meta": "3° anno · Sistemi distribuiti",
    "stato": "aggiornato",
    "color": "pd",
    "docs": [
      { "name": "Quaderno di Programmazione Distribuita", "kind": "Quaderno", "path": "Programmazione-Distribuita/Quaderno di Programmazione Distribuita/index.html", "progressKey": "quaderno-distribuita-done" },
      { "name": "Piano di studio per l'esame", "kind": "Piano di studio", "path": "Programmazione-Distribuita/Piano di studio PD.html", "progressKey": "piano-esame-pd" }
    ]
  },
  {
    "code": "SO",
    "resto": "1",
    "name": "Sistemi Operativi",
    "meta": "2° anno",
    "stato": "aggiornato",
    "color": "so",
    "docs": [
        { "name": "Quaderno di Sistemi Operativi", "kind": "Quaderno", "path": "Sistemi Operativi/Quaderno di Sistemi Operativi.html", "progressKey": "quaderno-so-cap3-15-v1" },
        { "name": "Piano di studio per l'esame", "kind": "Piano di studio", "path": "Sistemi Operativi/Piano di studio SO.html", "progressKey": "piano-esame-so" },
        { "name": "Quiz, capitoli 03–15", "kind": "Quiz", "path": "Sistemi Operativi/Quiz SO.html" }
    ]
  },
  {
    "code": "BD",
    "resto": "1",
    "name": "Basi di Dati",
    "meta": "2° anno · Database",
    "stato": "aggiornato",
    "color": "bd",
    "docs": [
      { "name": "Quaderno di Basi di Dati", "kind": "Quaderno", "path": "Basi di Dati/Quaderno di Basi di Dati.html", "progressKey": "quaderno-basi-done" },
      { "name": "Piano di studio per l'esame", "kind": "Piano di studio", "path": "Basi di Dati/Piano di studio BD.html", "progressKey": "piano-esame-bd" }
    ]
  },
  {
    "code": "POO",
    "resto": "1",
    "name": "Programmazione Orientata agli Oggetti",
    "meta": "2° anno · Java",
    "stato": "aggiornato",
    "color": "poo",
    "docs": [
      { "name": "Quaderno di Programmazione Orientata agli Oggetti", "kind": "Quaderno", "path": "Programmazione Orientata agli Oggetti/Quaderno di Programmazione Orientata agli Oggetti.html", "progressKey": "quaderno-poo-done" },
      { "name": "Piano di studio per l'esame", "kind": "Piano di studio", "path": "Programmazione Orientata agli Oggetti/Piano di studio POO.html", "progressKey": "piano-esame-poo" }
    ]
  },
  {
    "code": "AL",
    "name": "Accompagnamento al lavoro",
    "meta": "3° anno · Orientamento in uscita",
    "stato": "in-aggiornamento",
    "color": "al",
    "docs": [
      { "name": "Quaderno di Accompagnamento al lavoro", "kind": "Quaderno", "path": "Accompagnamento al lavoro/Quaderno di Accompagnamento al lavoro.html", "progressKey": "quaderno-al-done" }
    ]
  }
]
/* CORSI-FINE */
;
