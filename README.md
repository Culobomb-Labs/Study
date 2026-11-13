# Appunti Unisa

Raccolta di appunti e materiali di studio per i corsi di Informatica dell'Università degli Studi di Salerno.

**Sito del progetto:** [Appunti Unisa](https://culobomb-labs.github.io/Study/)

## Organizzazione del repository

- `Unisa/` contiene le pagine, i quaderni, i quiz e le risorse pubblicate.
- `Unisa/assets/corsi.js` definisce il catalogo dei corsi e i collegamenti ai documenti.
- `Unisa/assets/site.js` e `Unisa/assets/site.css` gestiscono le funzionalità e gli stili comuni.
- `Unisa/news.json` contiene le notizie mostrate sul sito.
- `.github/scripts/` contiene gli script di preparazione, aggiornamento delle notizie e notifica.
- `.github/workflows/pages.yml` definisce il processo di pubblicazione su GitHub Pages.

## Aggiungere o aggiornare materiale

1. Aggiungere o modificare il documento nella cartella del corso sotto `Unisa/`.
2. Se necessario, aggiornare il catalogo in `Unisa/assets/corsi.js`. Il contenuto tra `CORSI-INIZIO` e `CORSI-FINE` deve essere JSON valido; i percorsi sono relativi a `Unisa/`.
3. Verificare i collegamenti e il funzionamento della pagina, quindi proporre le modifiche attraverso il normale flusso Git del repository.

I documenti in formato HTML vengono preparati per la ricerca e la navigazione comuni durante la build. Lo script può generare una notizia per un documento aggiunto o aggiornato; il testo `[no news]` nel messaggio del commit evita la notizia automatica.

## Build e pubblicazione

Per la build locale occorrono Git con la cronologia completa, Python 3 e la libreria Pillow. Dalla radice del repository:

```sh
python -m pip install Pillow
python .github/scripts/build_site.py
python -m http.server 8000 --directory _site
```

Aprire `http://localhost:8000/`. La build crea `_site/`, senza modificare i sorgenti: genera gli indici, aggiunge navigazione e metadati alle pagine e prepara il service worker per l'uso offline. Per provare accesso Google e Firebase occorrono connessione, configurazione e dominio autorizzati.

La pubblicazione è gestita dal workflow GitHub Actions: una modifica a `main` avvia la build e il deploy su GitHub Pages. L'indirizzo effettivo e le autorizzazioni dipendono dalle impostazioni del repository e dell'ambiente di pubblicazione.

## Data e versione

In fondo alla pagina principale sono mostrati il momento della build in ora di Roma e la versione del sito. La data dei singoli documenti corrisponde all'ultimo commit che ha modificato il relativo file.

La versione segue [Semantic Versioning 2.0.0](https://semver.org/) nella forma `MAJOR.MINOR.PATCH`, senza pre-release né build metadata. Viene calcolata durante la build percorrendo tutti i commit di `main` (una pull request conta come un solo commit):

| Tipo | Quando | Effetto |
|---|---|---|
| `major` | modifica incompatibile o sito rifatto | `1.4.2` → `2.0.0` |
| `minor` | nuova funzione, nuovo corso, quaderno, quiz o capitolo | `1.4.2` → `1.5.0` |
| `patch` | correzione, ritocco grafico o aggiornamento di contenuti esistenti | `1.4.2` → `1.4.3` |
| nessuno | news, README e file che non fanno parte del sito | invariata |

Il tipo dei commit già fatti è scritto in `.github/versioni.txt`. Per i nuovi commit il tipo si decide così, nell'ordine:

1. se il titolo del commit (la prima riga) contiene `[major]`, `[minor]`, `[patch]` o `[no version]`, vale quell'etichetta;
2. altrimenti è `major` se non è compatibile con il sito di prima: una pagina HTML in `Unisa/` tolta o spostata (i link salvati non funzionano più), oppure un corso, un documento o una chiave delle spunte (`progressKey`) tolti da `Unisa/assets/corsi.js` (chi aveva spuntato perde i progressi). Il motivo viene scritto nel log del deploy;
3. altrimenti è `minor` se aggiunge una pagina HTML in `Unisa/`, un corso o un documento in `Unisa/assets/corsi.js`, un capitolo (una `<section class="ch">` di un quaderno o una voce di `CHAPTERS` in un quiz) oppure almeno 10 domande a un quiz;
4. altrimenti non cambia la versione se tocca solo `Unisa/news.json`, le immagini delle news o file fuori da `Unisa/`;
5. altrimenti è `patch`.

Le news automatiche (`News automatica: ...`) sono sempre escluse. In una pull request vale l'etichetta più alta tra i titoli dei suoi commit. Le funzioni nuove del sito (per esempio un nuovo pulsante o un nuovo filtro in file già esistenti) non si riconoscono da sole: per quelle serve `[minor]`. Per una major senza scrivere niente, per esempio quando il sito viene rifatto, c'è il pulsante **Actions → "Nuova versione major" → Run workflow**: crea un commit vuoto con `[major]` e ripubblica il sito. Una nuova build dello stesso commit mantiene la stessa versione; per il calcolo serve la cronologia Git completa.

## Account, progressi e segnalazioni

L'accesso Google e la sincronizzazione dei progressi utilizzano Firebase. La pagina delle segnalazioni consente agli utenti autenticati di inviare una richiesta e seguirne lo stato; l'amministratore autorizzato può gestirla. Le autorizzazioni sono definite dalle regole Firestore effettivamente pubblicate nel progetto Firebase: la configurazione del client non sostituisce tali regole. Verificare dominio autorizzato, accessi, regole e funzionamento dopo ogni modifica alla configurazione.

Non inserire nel repository credenziali amministrative o chiavi di servizio. Il workflow delle notifiche utilizza i segreti configurati in GitHub Actions.

## Diritti e utilizzo

Il sito riporta l'avviso © Culobomb-Labs e il divieto di copiare o vendere gli appunti senza permesso. I materiali eventualmente appartenenti a terzi restano soggetti ai diritti dei rispettivi titolari. Per richieste di utilizzo rivolgersi al titolare dei diritti. Si veda anche [Diritti e utilizzo](COPYRIGHT.md).

Un repository pubblico e un sito statico rendono i file distribuiti accessibili ai visitatori: un avviso di copyright non impedisce tecnicamente il download o la copia. Per limitare l'accesso ai materiali non pubblici è necessaria un'infrastruttura separata con controllo degli accessi.
