"""News automatica quando carichi o aggiorni un documento dei corsi.

Si esegue prima di preparare il sito. Per ogni documento elencato in Unisa/assets/corsi.js
confronta la data dell'ultima modifica (da git) con quella del sito online (updates.json):
- il documento online non c'era      → "Nuovo: <nome>"
- la data è cambiata                 → "Aggiornato: <nome>"
Se trova qualcosa aggiunge UNA notizia in cima a Unisa/news.json (con "auto": true);
il passo successivo la salva nel repository e, dopo la pubblicazione, parte la notifica.

Niente notizia automatica se:
- il messaggio del commit contiene [no news] (o [senza news]): utile per le piccole correzioni;
- il sito online non risponde (meglio una notizia in meno che una sbagliata);
- c'è già una notizia automatica per le stesse modifiche.

Scrive in $GITHUB_OUTPUT  creata=true|false  e  titolo=<titolo>.
"""
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
import os

SITE_URL = "https://culobomb-labs.github.io/Study/"
NEWS = "Unisa/news.json"
SKIP = re.compile(r"\[(no|senza) news\]", re.I)


def output(**kw):
    path = os.environ.get("GITHUB_OUTPUT")
    lines = "".join(f"{k}={v}\n" for k, v in kw.items())
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(lines)
    print(lines.strip())


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout.strip()


def load_courses():
    with open("Unisa/assets/corsi.js", encoding="utf-8") as f:
        js = f.read()
    m = re.search(r"/\* CORSI-INIZIO \*/(.*?)/\* CORSI-FINE \*/", js, re.S)
    return json.loads(m.group(1))


def main():
    msg = git("log", "-1", "--format=%B")
    if SKIP.search(msg):
        print("Commit con [no news]: nessuna notizia automatica.")
        return output(creata="false")

    try:
        req = urllib.request.Request(f"{SITE_URL}updates.json?t={int(time.time())}", headers={"Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=20) as r:
            live = json.load(r).get("files", {})
    except Exception as e:
        print(f"Sito online non raggiungibile ({e}): nessuna notizia automatica.", file=sys.stderr)
        return output(creata="false")

    nuovi, aggiornati = [], []
    for c in load_courses():
        for d in c["docs"]:
            date = git("log", "-1", "--format=%cI", "--", f"Unisa/{d['path']}")
            if not date:
                continue
            was = live.get(d["path"])
            if was is None:
                nuovi.append((c, d, date))
            elif was != date:
                aggiornati.append((c, d, date))

    changes = nuovi + aggiornati
    if not changes:
        print("Nessun documento nuovo o aggiornato.")
        return output(creata="false")

    firma = hashlib.sha1("|".join(f"{d['path']}@{date}" for _, d, date in changes).encode()).hexdigest()[:8]
    oggi = datetime.now(ZoneInfo("Europe/Rome")).date().isoformat()
    nid = f"auto-{oggi}-{firma}"

    with open(NEWS, encoding="utf-8") as f:
        data = json.load(f)
    news = data.setdefault("news", [])
    if any(isinstance(n, dict) and n.get("id") == nid for n in news):
        print("Notizia automatica già presente.")
        return output(creata="false")

    codes = {c["code"] for c, _, _ in changes}
    nome = lambda c, d: d["name"] + (f" ({c['code']})" if len(codes) > 1 else "")
    if len(changes) == 1:
        c, d, _ = changes[0]
        titolo = f"{'Nuovo' if nuovi else 'Aggiornato'}: {d['name']}"
        testo = f"{c['name']}" + (f" · Resto {c['resto']}" if c.get("resto") else "") + (
            ": è online, aprilo dal sito." if nuovi else ": ci sono modifiche nuove, dai un'occhiata.")
        link = d["path"]
    else:
        titolo = "Nuovo materiale sul sito" if nuovi else "Appunti aggiornati"
        parts = []
        if nuovi:
            parts.append("Nuovi: " + ", ".join(nome(c, d) for c, d, _ in nuovi) + ".")
        if aggiornati:
            parts.append("Aggiornati: " + ", ".join(nome(c, d) for c, d, _ in aggiornati) + ".")
        testo = " ".join(parts)
        link = ""

    item = {"id": nid, "data": oggi, "titolo": titolo, "testo": testo}
    if len(codes) == 1:
        item["corso"] = next(iter(codes))
    if link:
        item["link"] = link
    item["auto"] = True
    news.insert(0, item)
    with open(NEWS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(item, ensure_ascii=False, indent=2))
    output(creata="true", titolo=titolo)


if __name__ == "__main__":
    main()
