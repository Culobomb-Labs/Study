"""Prepara il sito in _site/ partendo da Unisa/, senza toccare i file originali.

- copia Unisa/ in _site/
- aggiunge a ogni pagina di appunti un pulsante fisso che riporta alla home
- scrive _site/updates.json con la data dell'ultima modifica di ogni file (da git)
"""
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone

SRC = "Unisa"
OUT = "_site"

BUTTON = """
<!-- pulsante home aggiunto dal deploy -->
<style>
.unisa-home{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:60;
  display:inline-flex;align-items:center;gap:8px;padding:10px 16px 10px 13px;border-radius:999px;
  background:#111418;color:#fff;font:600 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;text-decoration:none;
  box-shadow:0 6px 20px rgba(0,0,0,.22);transition:transform .15s}
.unisa-home:hover{transform:translateY(-2px)}
.unisa-home:focus-visible{outline:3px solid #7ea2ff;outline-offset:2px}
@media (prefers-color-scheme:dark){.unisa-home{background:#eceef0;color:#111418}}
@media print{.unisa-home{display:none}}
</style>
<a class="unisa-home" href="{href}" aria-label="Torna alla home di Appunti Unisa">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/></svg>
  Appunti Unisa
</a>
"""


def last_commit_date(path):
    out = subprocess.run(["git", "log", "-1", "--format=%cI", "--", path],
                         capture_output=True, text=True).stdout.strip()
    return out or None


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)

    updates = {}
    for root, _, files in os.walk(OUT):
        for name in files:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, OUT).replace(os.sep, "/")
            date = last_commit_date(os.path.join(SRC, rel))
            if date:
                updates[rel] = date
            if not name.endswith(".html") or rel == "index.html":
                continue
            depth = rel.count("/")
            href = "../" * depth + "index.html"
            with open(full, encoding="utf-8") as f:
                html = f.read()
            snippet = BUTTON.replace("{href}", href)
            i = html.lower().rfind("</body>")
            html = html[:i] + snippet + html[i:] if i != -1 else html + snippet
            with open(full, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"pulsante home -> {rel} ({href})")

    with open(os.path.join(OUT, "updates.json"), "w", encoding="utf-8") as f:
        json.dump({"built": datetime.now(timezone.utc).isoformat(), "files": updates}, f, ensure_ascii=False, indent=1)
    open(os.path.join(OUT, ".nojekyll"), "w").close()


if __name__ == "__main__":
    main()
