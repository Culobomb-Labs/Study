"""Prepara il sito in _site/ partendo da Unisa/, senza toccare i file originali.

- copia Unisa/ in _site/
- collega a ogni pagina di appunti lo stile e lo script comuni (assets/site.css, assets/site.js):
  barra in alto, tema chiaro/scuro, ricerca, pulsanti per tornare alla home
- scrive _site/search-index.json con il testo dei capitoli, per la ricerca
- scrive _site/updates.json con la data dell'ultima modifica di ogni file (da git)
"""
import html
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone

SRC = "Unisa"
OUT = "_site"

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


def inject(page_html, root, rel):
    head_bits = THEME_BOOT + f'\n<link rel="stylesheet" href="{root}assets/site.css">\n'
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

    updates, index_secs = {}, []
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
            if rel in doc_names:
                index_secs += sections(rel, page, doc_names[rel])
            root = "../" * rel.count("/")
            with open(full, "w", encoding="utf-8") as f:
                f.write(inject(page, root, rel))
            print(f"collegata  {rel}  (home: {root or './'})")

    with open(os.path.join(OUT, "search-index.json"), "w", encoding="utf-8") as f:
        json.dump({"secs": index_secs}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, "updates.json"), "w", encoding="utf-8") as f:
        json.dump({"built": datetime.now(timezone.utc).isoformat(), "files": updates}, f, ensure_ascii=False, indent=1)
    open(os.path.join(OUT, ".nojekyll"), "w").close()
    print(f"ricerca: {len(index_secs)} capitoli indicizzati")


if __name__ == "__main__":
    main()
