"""Test della versione del sito (Semantic Versioning 2.0.0) e delle cronologie con merge."""
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "build_site.py"
SPEC = importlib.util.spec_from_file_location("build_site", SCRIPT)
build_site = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build_site)


class VersionTests(unittest.TestCase):
    def setUp(self):
        self.original_cwd = Path.cwd()
        self.temp = tempfile.TemporaryDirectory(prefix="study-version-")
        self.repo = Path(self.temp.name).resolve()
        os.chdir(self.repo)
        self.git("init", "-b", "main")
        self.git("config", "user.name", "Version Test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "commit.gpgsign", "false")
        self.write_commit("Unisa/index.html", "Baseline\n", "Initial commit")

    def tearDown(self):
        os.chdir(self.original_cwd)
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.run(
            ["git", *args], check=True, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        ).stdout.strip()

    def write_commit(self, path, content, message):
        file = self.repo / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
        self.git("add", path)
        self.git("commit", "-m", message)

    def test_first_commit_starts_at_zero_one_zero(self):
        self.assertEqual(build_site.site_version(), "0.1.0")

    def test_tags_follow_semver(self):
        self.write_commit("Unisa/a.html", "1\n", "Nuovo quaderno [minor]")
        self.assertEqual(build_site.site_version(), "0.2.0")
        self.write_commit("Unisa/a.html", "2\n", "Correzione")
        self.assertEqual(build_site.site_version(), "0.2.1")
        self.write_commit("Unisa/a.html", "3\n", "Sito online [major]")
        self.assertEqual(build_site.site_version(), "1.0.0")
        self.write_commit("Unisa/a.html", "4\n", "Nuova funzione [minor]")
        self.write_commit("Unisa/a.html", "5\n", "Ritocco")
        self.assertEqual(build_site.site_version(), "1.1.1")
        for number in range(6, 16):
            self.write_commit("Unisa/a.html", f"{number}\n", f"Ritocco {number}")
        self.assertEqual(build_site.site_version(), "1.1.11")

    def test_commits_without_site_changes_keep_the_version(self):
        self.write_commit("Unisa/news.json", "{}\n", "News automatica: Aggiornato [no news]")
        self.write_commit("Unisa/news.json", "[]\n", "News: Avviso")
        self.write_commit("Unisa/news/img/a.jpg", "x\n", "Immagine della news")
        self.write_commit("README.md", "Altro\n", "Aggiorna README")
        self.write_commit("Unisa/a.html", "1\n", "Prova [no version]")
        self.assertEqual(build_site.site_version(), "0.1.0")

    def test_pull_request_counts_once_with_highest_tag(self):
        self.git("checkout", "-b", "feature")
        self.write_commit("Unisa/a.html", "1\n", "Prima parte [minor]")
        self.write_commit("Unisa/a.html", "2\n", "Seconda parte [minor]")
        self.write_commit("Unisa/a.html", "3\n", "Correzione")
        self.git("checkout", "main")
        self.git("merge", "--no-ff", "-m", "Merge pull request #1", "feature")
        self.assertEqual(build_site.site_version(), "0.2.0")

    def test_tags_only_count_in_the_title(self):
        self.write_commit("Unisa/index.html", "2\n", "Ritocco\n\nEtichette possibili: [major], [minor]")
        self.assertEqual(build_site.site_version(), "0.1.1")

    def test_new_page_is_minor(self):
        self.write_commit("Unisa/Corso/Quiz.html", "<p>quiz</p>\n", "Quiz del corso")
        self.assertEqual(build_site.site_version(), "0.2.0")
        self.write_commit("Unisa/Corso/Quiz.html", "<p>quiz corretto</p>\n", "Correzione")
        self.assertEqual(build_site.site_version(), "0.2.1")

    def test_new_chapter_is_minor(self):
        page = '<section class="ch" id="c1"></section>\n'
        self.write_commit("Unisa/index.html", page, "Primo capitolo [patch]")
        self.write_commit("Unisa/index.html", page + '<section class="ch" id="c2"></section>\n', "Secondo capitolo")
        self.assertEqual(build_site.site_version(), "0.2.0")

    def test_quiz_questions_and_chapters(self):
        def quiz(chapters, questions):
            ch = ",".join(f'{{id:"c{i}",n:"{i:02}",t:"Capitolo {i}"}}' for i in range(chapters))
            qs = ",\n".join(f'{{x:1,c:"c0",q:"Domanda {i}",o:["a"]}}' for i in range(questions))
            return f"<script>const CHAPTERS = [{ch}];\nconst Q = [\n{qs}\n];</script>\n"
        self.write_commit("Unisa/index.html", quiz(1, 5), "Quiz [patch]")
        self.write_commit("Unisa/index.html", quiz(1, 9), "Quattro domande")
        self.assertEqual(build_site.site_version(), "0.1.2")
        self.write_commit("Unisa/index.html", quiz(1, 19), "Dieci domande")
        self.assertEqual(build_site.site_version(), "0.2.0")
        self.write_commit("Unisa/index.html", quiz(2, 19), "Nuovo capitolo del quiz")
        self.assertEqual(build_site.site_version(), "0.3.0")

    def test_courses_file(self):
        def courses(*codes, docs=1):
            data = [{"code": c, "docs": [{"path": f"{c}/{d}.html"} for d in range(docs)]} for c in codes]
            return "const C = /* CORSI-INIZIO */" + json.dumps(data) + "/* CORSI-FINE */;\n"
        self.write_commit("Unisa/assets/corsi.js", courses("IS"), "Catalogo [patch]")
        self.write_commit("Unisa/assets/corsi.js", courses("PO"), "Sigla rinominata")
        self.assertEqual(build_site.site_version(), "0.1.2")
        self.write_commit("Unisa/assets/corsi.js", courses("PO", "BD"), "Nuovo corso")
        self.assertEqual(build_site.site_version(), "0.2.0")
        self.write_commit("Unisa/assets/corsi.js", courses("PO", "BD", docs=2), "Nuovo documento")
        self.assertEqual(build_site.site_version(), "0.3.0")
        self.write_commit("Unisa/assets/corsi.js", courses("PO", "BD", "SO", docs=2), "Corso in prova [patch]")
        self.assertEqual(build_site.site_version(), "0.3.1")

    def test_history_file_overrides_tags(self):
        self.write_commit("Unisa/a.html", "1\n", "Ritocco [major]")
        sha = self.git("rev-parse", "HEAD")
        self.write_commit(".github/versioni.txt", f"# storico\n{sha} minor  # 0.2.0 · Ritocco\n", "Storico")
        self.assertEqual(build_site.site_version(), "0.2.0")

    def test_shallow_clone_fails_with_clear_error(self):
        self.write_commit("Unisa/a.html", "1\n", "Ritocco")
        clone = self.repo.parent / (self.repo.name + "-shallow")
        subprocess.run(["git", "clone", "-q", "--depth", "1", self.repo.as_uri(), str(clone)], check=True)
        os.chdir(clone)
        try:
            with self.assertRaisesRegex(RuntimeError, "cronologia Git completa"):
                build_site.site_version()
        finally:
            os.chdir(self.repo)
            subprocess.run(["rm", "-rf", str(clone)], check=True)


if __name__ == "__main__":
    unittest.main()
