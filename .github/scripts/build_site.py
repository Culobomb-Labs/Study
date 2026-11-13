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

THEME_BOOT = '<script>try{var d=document.documentElement,t=localStorage.getItem("ua-theme"),g=localStorage.getItem("ua-glass");if(t&&t!="auto")d.setAttribute("data-theme",t);if(g)d.setAttribute("data-glass",g)}catch(e){}</script>'


# ---------------------------------------------------------------------------
# Versione del sito: Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH, senza pre-release
# e build metadata). Ogni commit di main (le pull request contano come uno) vale:
#   major -> X+1.0.0   minor -> X.Y+1.0   patch -> X.Y.Z+1   nessuna -> invariata
# Il tipo dei commit passati è scritto in .github/versioni.txt; per i nuovi si usa
# l'etichetta nel messaggio ([major], [minor], [patch], [no version]).
# ---------------------------------------------------------------------------
VERSION_HISTORY = ".github/versioni.txt"
VERSION_TAG = re.compile(r"\[(major|minor|patch|no version)\]", re.I)
VERSION_RANK = {"no version": 0, "patch": 1, "minor": 2, "major": 3}
NEWS_FILES = re.compile(r"^Unisa/news(?:\.json$|/)")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


def version_history():
    """Legge lo storico: {commit: "major" | "minor" | "patch" | None}."""
    history = {}
    if not os.path.exists(VERSION_HISTORY):
        return history
    with open(VERSION_HISTORY, encoding="utf-8") as f:
        for line in f:
            fields = line.split("#", 1)[0].split()
            if len(fields) >= 2:
                history[fields[0]] = None if fields[1] == "-" else fields[1].lower()
    return history


def commit_kind(sha, parents, message, files):
    """Tipo di un commit non presente nello storico."""
    if message.startswith("News automatica: "):
        return None  # la news automatica non è una modifica del sito
    messages = message
    if len(parents) > 1:  # pull request: contano anche i messaggi dei suoi commit
        messages += git("log", "--format=%B", f"{parents[0]}..{parents[1]}")
    tags = {tag.lower() for tag in VERSION_TAG.findall(messages)}
    if tags:
        best = max(tags, key=VERSION_RANK.get)
        return None if best == "no version" else best
    site_files = [name for name in files if name.startswith(SRC + "/")]
    if not site_files or all(NEWS_FILES.match(name) for name in site_files):
        return None  # solo news o file fuori dal sito
    return "patch"


def site_version():
    """Calcola la versione SemVer percorrendo tutta la cronologia di main."""
    if git("rev-parse", "--is-shallow-repository").strip() == "true":
        raise RuntimeError("Per calcolare la versione serve la cronologia Git completa (fetch-depth: 0).")
    history = version_history()
    log = git("log", "--first-parent", "--reverse", "--diff-merges=first-parent",
              "--name-only", "--format=%x1e%H%x1f%P%x1f%B%x1f")
    version = None
    for record in log.split("\x1e")[1:]:
        sha, parents, message, files = record.split("\x1f")
        if sha in history:
            kind = history[sha]
        else:
            kind = commit_kind(sha, parents.split(), message.strip(), [f for f in files.split("\n") if f])
        if kind is None:
            continue
        if version is None:
            version = [0, 1, 0]  # primo commit: inizio dello sviluppo (SemVer consiglia 0.1.0)
        elif kind == "major":
            version = [version[0] + 1, 0, 0]
        elif kind == "minor":
            version = [version[0], version[1] + 1, 0]
        else:
            version[2] += 1
    return ".".join(map(str, version or [0, 1, 0]))


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


QUIZ_CH = re.compile(r'\{\s*"?id"?\s*:\s*"([^"]+)"\s*,\s*"?n"?\s*:\s*"([^"]*)"\s*,\s*"?t"?\s*:\s*"((?:[^"\\]|\\.)*)"')
QUIZ_Q = re.compile(r'\{\s*"?c"?\s*:\s*"([^"]+)"\s*,\s*"?q"?\s*:\s*"((?:[^"\\]|\\.)*)"')


def quiz_sections(path, page_html):
    """Domande di un quiz per la ricerca, una voce per capitolo: solo il testo delle domande, mai le risposte.
    Le prende dalle liste CHAPTERS e Q dello script della pagina (l'id del capitolo diventa l'ancora del link)."""
    try:
        a = page_html.index("const CHAPTERS")
        b = page_html.index("const Q =", a)
        e = page_html.index("\n];", b)
    except ValueError:
        return []
    unq = lambda x: json.loads('"' + x + '"')
    qs = {}
    for c, q in QUIZ_Q.findall(page_html[b:e]):
        qs.setdefault(c, []).append(unq(q))
    return [{"p": path, "i": cid, "t": unq(t), "n": n, "x": " · ".join(qs[cid])}
            for cid, n, t in QUIZ_CH.findall(page_html[a:b]) if qs.get(cid)]


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
            f'<link rel="icon" href="{root}icon.svg?v=10" type="image/svg+xml">\n'
            f'<link rel="icon" href="{root}favicon.ico?v=10" sizes="16x16 32x32 48x48">\n'
            f'<link rel="icon" href="{root}favicon-32.png?v=10" sizes="32x32" type="image/png">\n'
            f'<link rel="apple-touch-icon" href="{root}apple-touch-icon.png?v=10">\n'
            f'<link rel="manifest" href="{root}manifest.webmanifest">\n'
            f'<meta property="og:type" content="article">\n'
            f'<meta property="og:site_name" content="Appunti Unisa">\n'
            f'<meta property="og:title" content="{t}">\n'
            f'<meta property="og:description" content="{d}">\n'
            f'<meta property="og:url" content="{page_url}">\n'
            f'<meta property="og:image" content="{SITE_URL}og.png?v=4">\n'
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

    # elenco delle immagini per le news (il modulo dell'amministratore nella pagina News le propone in un menu)
    img_dir = os.path.join(OUT, "news", "img")
    imgs = sorted(n for n in os.listdir(img_dir) if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"))) if os.path.isdir(img_dir) else []
    os.makedirs(os.path.join(OUT, "news"), exist_ok=True)
    with open(os.path.join(OUT, "news", "immagini.json"), "w", encoding="utf-8") as f:
        json.dump(imgs, f, ensure_ascii=False)

    courses = load_courses()
    doc_names = {d["path"]: d["name"] for c in courses for d in c["docs"]}
    doc_course = {d["path"]: c for c in courses for d in c["docs"]}
    doc_progress = {d["path"]: d.get("progressKey") for c in courses for d in c["docs"]}
    doc_kind = {d["path"]: d.get("kind") for c in courses for d in c["docs"]}

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
                if doc_kind.get(rel) == "Quiz":
                    index_secs += quiz_sections(rel, page)
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
        json.dump({"built": datetime.now(timezone.utc).isoformat(), "version": site_version(), "files": updates, "progress": progress}, f, ensure_ascii=False, indent=1)
    open(os.path.join(OUT, ".nojekyll"), "w").close()

    # service worker: versione del sito + elenco di tutti i file da salvare per l'uso offline
    precache = []
    for root_dir, _, files in os.walk(OUT):
        for name in files:
            rel = os.path.relpath(os.path.join(root_dir, name), OUT).replace(os.sep, "/")
            if rel in ("sw.js", ".nojekyll") or rel.endswith(".md") or rel.startswith("news/img/"):
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
