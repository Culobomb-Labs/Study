/* Elenco dei corsi del sito. È l'unico posto da modificare quando aggiungi materiale.
   - path: percorso del file a partire dalla cartella Unisa (gli spazi vanno bene)
   - color: is | mp | pd | ... (i colori sono in assets/site.css, variabili --ua-c-...)
   Il contenuto tra le due righe CORSI deve restare JSON valido (virgolette doppie, niente virgole finali):
   lo legge anche lo script di pubblicazione per costruire la ricerca. */
window.CORSI =
/* CORSI-INIZIO */
[
  {
    "code": "IS",
    "name": "Ingegneria del Software",
    "meta": "3° anno",
    "color": "is",
    "docs": [
      { "name": "Quaderno di Ingegneria del Software", "kind": "Quaderno", "path": "Ingenieria del Software/Quaderno di Ingegneria del Software.html" },
      { "name": "Piano di studio, prima prova", "kind": "Piano di studio", "path": "Ingenieria del Software/Piano Studio IS.html" }
    ]
  },
  {
    "code": "MP",
    "name": "Mobile Programming",
    "meta": "Android",
    "color": "mp",
    "docs": [
      { "name": "Quaderno di Android", "kind": "Quaderno", "path": "Mobile Programming/Quaderno di Android.html" }
    ]
  },
  {
    "code": "PD",
    "name": "Programmazione Distribuita",
    "meta": "Sistemi distribuiti",
    "color": "pd",
    "docs": [
      { "name": "Quaderno di Programmazione Distribuita", "kind": "Quaderno", "path": "Programmazione-Distribuita/Quaderno di Programmazione Distribuita/index.html" }
    ]
  }
]
/* CORSI-FINE */
;
