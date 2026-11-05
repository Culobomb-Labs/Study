"""Descrive COSA è cambiato in un documento, per le notizie automatiche (e quindi per le notifiche).

news_auto.py conosce solo la data dell'ultima modifica di ogni documento. Qui si ricostruisce
la versione che era online (il commit con quella data) e la si confronta con quella nuova:

- Quiz       → domande aggiunte / tolte / corrette, con i capitoli interessati
- Quaderno   → capitoli modificati, nuovi o tolti
- altro      → il messaggio del commit (se c'è), altrimenti una frase generica

Se qualcosa non si riesce a ricostruire restituisce None e news_auto.py usa la frase generica
di prima: meglio una notizia vaga che nessuna notizia.
"""
import re
import subprocess
from datetime import datetime

MAX_CAPS = 4  # quanti capitoli elencare prima di scrivere "e altri N"


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def parse_date(s):
    try:
        return datetime.fromisoformat(s)
    except (TypeError, ValueError):
        return None


def baseline(path, was):
    """Commit che corrisponde alla versione online del file (None se non si trova)."""
    out = git("log", "--format=%H %cI", "--", path)
    if not out:
        return None
    rows = [l.split(" ", 1) for l in out.splitlines() if " " in l]
    for h, d in rows:  # il commit con esattamente la data pubblicata
        if d == was:
            return h
    was_dt = parse_date(was)
    if not was_dt:
        return None
    for h, d in rows:  # altrimenti l'ultimo commit non più recente di quella data
        dt = parse_date(d)
        if dt and dt <= was_dt:
            return h
    return None


def show(rev, path):
    return git("show", f"{rev}:{path}")


def subjects(base, path):
    """Messaggi dei commit fatti dopo la versione online, senza quelli del bot."""
    out = git("log", "--format=%s", f"{base}..HEAD", "--", path) or ""
    res = []
    for s in out.splitlines():
        s = re.sub(r"\[[^\]]*\]", "", s).strip(" .-:")
        if s and not s.lower().startswith("news automatica") and s not in res:
            res.append(s)
    return res


# ---------- quiz ----------
Q_LINE = re.compile(r'^\s*\{\s*c:\s*"([^"]+)"\s*,\s*q:\s*"((?:[^"\\]|\\.)*)"')
CH_LINE = re.compile(r'\{\s*id:\s*"([^"]+)"\s*,\s*n:\s*"([^"]+)"')


def quiz_questions(text):
    qs = {}
    for line in text.splitlines():
        m = Q_LINE.match(line)
        if m:
            qs[(m.group(1), m.group(2))] = line.strip()
    return qs


def chapter_numbers(text):
    return {m.group(1): m.group(2) for m in CH_LINE.finditer(text)}


def caps(ids, nums):
    labels = sorted({nums.get(i, i) for i in ids})
    shown = labels[:MAX_CAPS]
    s = ", ".join(shown)
    if len(labels) > MAX_CAPS:
        s += f" e altri {len(labels) - MAX_CAPS}"
    return ("cap. " if len(labels) == 1 else "capitoli ") + s


def plural(n, one, many):
    return f"{n} {one if n == 1 else many}"


def describe_quiz(old, new):
    a, b = quiz_questions(old), quiz_questions(new)
    nums = {**chapter_numbers(old), **chapter_numbers(new)}
    added = [k for k in b if k not in a]
    removed = [k for k in a if k not in b]
    fixed = [k for k in b if k in a and a[k] != b[k]]
    parts = []
    if added:
        parts.append(f"{plural(len(added), 'domanda nuova', 'domande nuove')} ({caps({k[0] for k in added}, nums)})")
    if fixed:
        parts.append(f"{plural(len(fixed), 'domanda corretta', 'domande corrette')} ({caps({k[0] for k in fixed}, nums)})")
    if removed:
        parts.append(f"{plural(len(removed), 'domanda tolta', 'domande tolte')} ({caps({k[0] for k in removed}, nums)})")
    return ", ".join(parts) or None


# ---------- quaderni ----------
SEC = re.compile(r'<section class="ch" id="([^"]+)"([^>]*)>')


def sections(text):
    res = {}
    ms = list(SEC.finditer(text))
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        body = text[m.start():end]
        title = re.search(r'data-t="([^"]*)"', m.group(2))
        num = re.search(r'class="ch-num">([^<]+)<', body)
        plain = re.sub(r"<script.*?</script>|<style.*?</style>", " ", body, flags=re.S)
        plain = re.sub(r"<[^>]+>", " ", plain)
        plain = re.sub(r"\s+", " ", plain).strip()
        res[m.group(1)] = (num.group(1).strip() if num else "", title.group(1) if title else m.group(1), plain)
    return res


def chapter_label(sec):
    num, title, _ = sec
    return f"{num} {title}".strip()


def listing(labels, one, many):
    shown = labels[:MAX_CAPS]
    s = ", ".join(shown)
    if len(labels) > MAX_CAPS:
        s += f" e altri {len(labels) - MAX_CAPS}"
    return (one if len(labels) == 1 else many) + " " + s


def describe_notebook(old, new):
    a, b = sections(old), sections(new)
    if not b:
        return None
    nuovi = [chapter_label(b[k]) for k in b if k not in a]
    tolti = [chapter_label(a[k]) for k in a if k not in b]
    cambiati = [chapter_label(b[k]) for k in b if k in a and a[k][2] != b[k][2]]
    parts = []
    if nuovi:
        parts.append(listing(nuovi, "nuovo capitolo", "nuovi capitoli"))
    if cambiati:
        parts.append(listing(cambiati, "rivisto il capitolo", "rivisti i capitoli"))
    if tolti:
        parts.append(listing(tolti, "tolto il capitolo", "tolti i capitoli"))
    return "; ".join(parts) or None


# ---------- ingresso ----------
def describe(doc, was):
    """Frase breve su cosa è cambiato in `doc` rispetto alla versione online, o None."""
    path = f"Unisa/{doc['path']}"
    try:
        base = baseline(path, was)
        if not base:
            return None
        old, new = show(base, path), show("HEAD", path)
        if old is None or new is None:
            return None
        kind = (doc.get("kind") or "").lower()
        text = None
        if "quiz" in kind:
            text = describe_quiz(old, new)
        elif "quaderno" in kind:
            text = describe_notebook(old, new)
        if not text:
            subj = subjects(base, path)
            if subj:
                text = "; ".join(subj[:2])
        if text:
            return text[0].upper() + text[1:]
    except Exception as e:  # mai bloccare la pubblicazione per una descrizione
        print(f"Dettagli non disponibili per {path}: {e}")
    return None
