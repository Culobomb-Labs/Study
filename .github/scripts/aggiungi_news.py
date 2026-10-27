"""Aggiunge una notizia in cima a Unisa/news.json, con i campi scritti nel modulo dell'azione
"Pubblica una news" (scheda Actions di GitHub). Così non serve toccare il JSON a mano.

Variabili: TITOLO (obbligatorio), TESTO, CORSO, LINK, IMMAGINE.
IMMAGINE è il nome di un file caricato prima in Unisa/news/img/ (es. quiz.jpg),
oppure un indirizzo web che inizia con https://.
"""
import json
import os
import re
import sys
import unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo

NEWS = "Unisa/news.json"
IMG_DIR = "Unisa/news/img"
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")


def fail(msg):
    print(f"::error::{msg}")
    sys.exit(1)


def slug(text, words=4):
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    parts = re.findall(r"[a-z0-9]+", t)
    return "-".join(parts[:words]) or "notizia"


def main():
    get = lambda k: (os.environ.get(k) or "").strip()
    titolo, testo, corso, link, immagine = get("TITOLO"), get("TESTO"), get("CORSO"), get("LINK"), get("IMMAGINE")
    if not titolo:
        fail("Il titolo è obbligatorio.")
    if corso in ("", "nessuno", "-"):
        corso = ""

    with open(NEWS, encoding="utf-8") as f:
        data = json.load(f)
    news = data.setdefault("news", [])

    if immagine:
        if not immagine.startswith("https://"):
            name = immagine.split("/")[-1]
            if not os.path.isfile(os.path.join(IMG_DIR, name)):
                have = sorted(x for x in os.listdir(IMG_DIR) if x.lower().endswith(IMG_EXT)) if os.path.isdir(IMG_DIR) else []
                fail(f"Non trovo l'immagine '{name}' in {IMG_DIR}. Caricala lì prima (Add file → Upload files). "
                     f"Immagini presenti: {', '.join(have) or 'nessuna'}.")
            if not name.lower().endswith(IMG_EXT):
                fail(f"'{name}' non sembra un'immagine (servono {', '.join(IMG_EXT)}).")
            immagine = "news/img/" + name

    oggi = datetime.now(ZoneInfo("Europe/Rome")).date().isoformat()
    base = f"{oggi}-{slug(titolo)}"
    ids = {n.get("id") for n in news if isinstance(n, dict)}
    nid, k = base, 2
    while nid in ids:
        nid, k = f"{base}-{k}", k + 1

    item = {"id": nid, "data": oggi, "titolo": titolo}
    for key, val in (("testo", testo), ("corso", corso), ("link", link), ("immagine", immagine)):
        if val:
            item[key] = val
    news.insert(0, item)

    with open(NEWS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(item, ensure_ascii=False, indent=2))
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"id={nid}\n")


if __name__ == "__main__":
    main()
