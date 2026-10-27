"""Prepara il sito in _site/ partendo da Unisa/, senza toccare i file originali.

- copia Unisa/ in _site/
- collega a ogni pagina di appunti lo stile e lo script comuni (assets/site.css, assets/site.js):
  barra in alto, tema chiaro/scuro, ricerca, pulsanti per tornare alla home
- scrive _site/search-index.json con il testo dei capitoli, per la ricerca
- scrive _site/updates.json con la data dell'ultima modifica di ogni file (da git)
  e i capitoli di ogni quaderno (per l'avanzamento mostrato in home)
- estrae le immagini incorporate (data:...;base64) in file separati: le pagine si aprono prima
- aggiunge icona, anteprima per i link condivisi e manifest dell'app a ogni pagina
- prepara sw.js (uso offline) con l'elenco dei file del sito
"""
import base64
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone

SRC = "Unisa"
OUT = "_site"

SITE_URL = "https://culobomb-labs.github.io/Study/"
EXT = {"png": "png", "jpeg": "jpg", "jpg": "jpg", "gif": "gif", "webp": "webp", "svg+xml": "svg"}

THEME_BOOT = '<script>try{var t=localStorage.getItem("ua-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>'


def last_commit_date(path):
    out = subprocess.run(["git", "log", "-1", "--format=%cI", "--", path],
                         capture_output=True, text=True).stdout.strip()
    return out or None


def load_courses():
    with open(os.path.join(SRC, "assets", "corsi.js"), encoding="utf-8") as f:
        js = f.read()
    m = re.search(r"/\* CORSI-INIZIO \*/(.*?)/\* CORSI-FINE \*/", js, re.S)
    return json.loads(m.group(1))


def plain_text(fragment):
    fragment = re.sub(r"<(script|style|svg)\b[^>]*>.*?</\1>", " ", fragment, flags=re.S | re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return " ".join(html.unescape(fragment).split())


def sections(path, page_html, doc_name):
    """Divide la pagina nei suoi capitoli (<section class="ch" id=...>)."""
    body = page_html[page_html.lower().find("<body"):]
    starts = list(re.finditer(r'<section\b[^>]*\bclass="ch"[^>]*>', body))
    out = []
    for k, m in enumerate(starts):
        tag = m.group(0)
        sid = re.search(r'\bid="([^"]+)"', tag)
        if not sid:
            continue
        end = starts[k + 1].start() if k + 1 < len(starts) else len(body)
        chunk = body[m.end():end]
        title = re.search(r'\bdata-t="([^"]*)"', tag)
        num = re.search(r'class="ch-num"[^>]*>(.*?)<', chunk)
        h2 = re.search(r"<h2[^>]*>(.*?)</h2>", chunk, re.S)
        t = html.unescape(title.group(1)) if title else (plain_text(h2.group(1)) if h2 else sid.group(1))
        out.append({"p": path, "i": sid.group(1), "t": t,
                    "n": plain_text(num.group(1)) if num else "",
                    "x": plain_text(chunk)})
    if not out:  # pagina senza capitoli (es. il piano di studio): un'unica voce
        out.append({"p": path, "i": "", "t": doc_name, "n": "", "x": plain_text(body)})
    return out


def extract_images(page_html, page_dir):
    """Sposta le immagini incorporate in file a parte (cartella _img accanto alla pagina)."""
    count = 0

    def repl(tag_match):
        nonlocal count
        tag = tag_match.group(0)
        m = re.search(r'\bsrc="data:image/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)"', tag)
        if not m:
            return tag
        kind, data = m.group(1).lower(), m.group(2)
        try:
            raw = base64.b64decode(data)
        except Exception:
            return tag
        name = hashlib.sha1(raw).hexdigest()[:14] + "." + EXT.get(kind, "bin")
        os.makedirs(os.path.join(page_dir, "_img"), exist_ok=True)
        with open(os.path.join(page_dir, "_img", name), "wb") as f:
            f.write(raw)
        count += 1
        size = ""
        if not re.search(r"\bwidth=", tag):
            try:  # larghezza e altezza: la pagina non "salta" mentre le immagini arrivano
                from PIL import Image
                import io
                w, h = Image.open(io.BytesIO(raw)).size
                size = f' width="{w}" height="{h}"'
            except Exception:
                pass
        return tag[:m.start()] + f'src="_img/{name}"{size}' + tag[m.end():]

    out = re.sub(r"<img\b[^>]*>", repl, page_html)
    # caricamento pigro: le immagini più in basso arrivano solo quando servono
    out = re.sub(r'<img\b(?![^>]*\bloading=)', '<img loading="lazy" decoding="async"', out)
    return out, count


def head_meta(root, title, desc, rel):
    t, d = html.escape(title, quote=True), html.escape(desc, quote=True)
    page_url = SITE_URL + "/".join(quote_part(x) for x in rel.split("/"))
    return (f'<meta name="theme-color" content="#111418">\n'
            f'<link rel="icon" href="{root}icon.svg" type="image/svg+xml">\n'
            f'<link rel="icon" href="{root}favicon-32.png" sizes="32x32" type="image/png">\n'
            f'<link rel="apple-touch-icon" href="{root}apple-touch-icon.png">\n'
            f'<link rel="manifest" href="{root}manifest.webmanifest">\n'
            f'<meta property="og:type" content="article">\n'
            f'<meta property="og:site_name" content="Appunti Unisa">\n'
            f'<meta property="og:title" content="{t}">\n'
            f'<meta property="og:description" content="{d}">\n'
            f'<meta property="og:url" content="{page_url}">\n'
            f'<meta property="og:image" content="{SITE_URL}og.png?v=2">\n'
            f'<meta property="og:locale" content="it_IT">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n')


def quote_part(x):
    from urllib.parse import quote
    return quote(x)


def plan_total(page_html):
    """Numero di attività del piano di studio (array PLAN con le liste tasks)."""
    m = re.search(r"const PLAN\s*=\s*\[(.*?)\];", page_html, re.S)
    if not m:
        return 0
    return sum(len(re.findall(r'"(?:[^"\\]|\\.)*"', t)) for t in re.findall(r"tasks:\[(.*?)\]\}", m.group(1), re.S))


def inject(page_html, root, rel, meta=""):
    head_bits = THEME_BOOT + f'\n<link rel="stylesheet" href="{root}assets/site.css">\n' + meta
    i = page_html.lower().find("</head>")
    page_html = page_html[:i] + head_bits + page_html[i:] if i != -1 else head_bits + page_html
    m = re.search(r"<body\b[^>]*>", page_html, re.I)
    bar = '\n<div id="ua-bar" class="ua-bar"></div>\n'
    page_html = page_html[:m.end()] + bar + page_html[m.end():] if m else bar + page_html
    tail = (f'\n<script src="{root}assets/corsi.js"></script>\n'
            f'<script src="{root}assets/site.js" data-root="{root}" data-page="{html.escape(rel, quote=True)}"></script>\n')
    i = page_html.lower().rfind("</body>")
    return page_html[:i] + tail + page_html[i:] if i != -1 else page_html + tail


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)

    courses = load_courses()
    doc_names = {d["path"]: d["name"] for c in courses for d in c["docs"]}
    doc_course = {d["path"]: c for c in courses for d in c["docs"]}
    doc_progress = {d["path"]: d.get("progressKey") for c in courses for d in c["docs"]}

    updates, index_secs, progress = {}, [], {}
    for root_dir, _, files in os.walk(OUT):
        for name in files:
            full = os.path.join(root_dir, name)
            rel = os.path.relpath(full, OUT).replace(os.sep, "/")
            date = last_commit_date(os.path.join(SRC, rel))
            if date:
                updates[rel] = date
            if not name.endswith(".html") or rel == "index.html":
                continue
            with open(full, encoding="utf-8") as f:
                page = f.read()
            page, n_img = extract_images(page, os.path.dirname(full))
            if rel in doc_names:
                secs = sections(rel, page, doc_names[rel])
                index_secs += secs
                if doc_progress.get(rel):
                    ids = [x["i"] for x in secs if x["i"]]
                    progress[rel] = {"ids": ids} if ids else {"total": plan_total(page)}
            root = "../" * rel.count("/")
            c = doc_course.get(rel)
            title = doc_names.get(rel) or (re.search(r"<title>(.*?)</title>", page, re.S | re.I) or [None, "Appunti Unisa"])[1]
            desc = f"{c['name']} · Appunti Unisa" if c else "Appunti Unisa"
            with open(full, "w", encoding="utf-8") as f:
                f.write(inject(page, root, rel, head_meta(root, title, desc, rel)))
            print(f"collegata  {rel}  (home: {root or './'}, immagini estratte: {n_img})")

    with open(os.path.join(OUT, "search-index.json"), "w", encoding="utf-8") as f:
        json.dump({"secs": index_secs}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, "updates.json"), "w", encoding="utf-8") as f:
        json.dump({"built": datetime.now(timezone.utc).isoformat(), "files": updates, "progress": progress}, f, ensure_ascii=False, indent=1)
    open(os.path.join(OUT, ".nojekyll"), "w").close()

    # service worker: versione del sito + elenco di tutti i file da salvare per l'uso offline
    precache = []
    for root_dir, _, files in os.walk(OUT):
        for name in files:
            rel = os.path.relpath(os.path.join(root_dir, name), OUT).replace(os.sep, "/")
            if rel in ("sw.js", ".nojekyll") or rel.endswith(".md"):
                continue
            precache.append("./" + "/".join(quote_part(x) for x in rel.split("/")))
    precache.sort()
    stamp = hashlib.sha1("".join(precache).encode() + datetime.now(timezone.utc).isoformat().encode()).hexdigest()[:10]
    sw_path = os.path.join(OUT, "sw.js")
    with open(sw_path, encoding="utf-8") as f:
        sw = f.read()
    sw = sw.replace('"__VERSIONE__"', json.dumps(stamp)).replace("__FILE__", json.dumps(precache))
    with open(sw_path, "w", encoding="utf-8") as f:
        f.write(sw)
    print(f"offline: {len(precache)} file salvabili, versione {stamp}")
    print(f"ricerca: {len(index_secs)} capitoli indicizzati")


if __name__ == "__main__":
    main()
