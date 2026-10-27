/* Elenco dei corsi del sito. È l'unico posto da modificare quando aggiungi materiale.
   - path: percorso del file a partire dalla cartella Unisa (gli spazi vanno bene)
   - color: is | mp | pd | ... (i colori sono in assets/site.css, variabili --ua-c-...)
   - stato: "aggiornato" (appunti completi e aggiornati) oppure "in-aggiornamento" (appunti ancora in lavorazione)
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
    "stato": "in-aggiornamento",
    "color": "is",
    "docs": [
      { "name": "Quaderno di Ingegneria del Software", "kind": "Quaderno", "path": "Ingenieria del Software/Quaderno di Ingegneria del Software.html", "progressKey": "quaderno-ingsw-done" },
      { "name": "Piano di studio, prima prova", "kind": "Piano di studio", "path": "Ingenieria del Software/Piano Studio IS.html", "progressKey": "piano-ingsw-v1" },
      { "name": "Quiz, capitoli 01–09", "kind": "Quiz", "path": "Ingenieria del Software/Quiz IS.html" }
    ]
  },
  {
    "code": "MP",
    "name": "Mobile Programming",
    "meta": "3° anno · Android",
    "stato": "aggiornato",
    "color": "mp",
    "docs": [
      { "name": "Quaderno di Android", "kind": "Quaderno", "path": "Mobile Programming/Quaderno di Android.html", "progressKey": "quaderno-android-done" }
    ]
  },
  {
    "code": "PD",
    "resto": "1",
    "name": "Programmazione Distribuita",
    "meta": "3° anno · Sistemi distribuiti",
    "stato": "in-aggiornamento",
    "color": "pd",
    "docs": [
      { "name": "Quaderno di Programmazione Distribuita", "kind": "Quaderno", "path": "Programmazione-Distribuita/Quaderno di Programmazione Distribuita/index.html", "progressKey": "quaderno-distribuita-done" }
    ]
  }
]
/* CORSI-FINE */
;
