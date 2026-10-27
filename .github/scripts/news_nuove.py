"""Trova le notizie nuove: quelle in Unisa/news.json che il sito online non ha ancora.

Si esegue prima di pubblicare il sito. Confronta la news.json del repository con quella
pubblicata adesso su GitHub Pages: le notizie con un id che online non c'è sono "nuove"
e, dopo la pubblicazione, ricevono la notifica.

Scrive in $GITHUB_OUTPUT la riga  nuove=<elenco JSON>  (vuoto: [] ).
Se il sito online non risponde non manda niente: meglio una notifica in meno che una doppia.
"""
import json
import os
import sys
import time
import urllib.request

SITE_URL = "https://culobomb-labs.github.io/Study/"
MAX = 3  # al massimo 3 notifiche per pubblicazione


def output(items):
    line = "nuove=" + json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    print(line)


def main():
    with open("Unisa/news.json", encoding="utf-8") as f:
        here = [n for n in json.load(f).get("news", []) if isinstance(n, dict) and n.get("id") and n.get("titolo")]

    try:
        req = urllib.request.Request(f"{SITE_URL}news.json?t={int(time.time())}", headers={"Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=20) as r:
            live = json.load(r).get("news", [])
    except urllib.error.HTTPError as e:
        live = [] if e.code == 404 else None  # 404: news.json non era ancora online
    except Exception as e:  # rete, JSON rotto...
        print(f"Sito online non raggiungibile ({e}): nessuna notifica.", file=sys.stderr)
        live = None
    if live is None:
        output([])
        return

    old = {n.get("id") for n in live if isinstance(n, dict)}
    fresh = [n for n in here if n["id"] not in old][:MAX]
    output([{"id": n["id"], "titolo": n["titolo"], "testo": n.get("testo", "")} for n in fresh])


if __name__ == "__main__":
    main()
