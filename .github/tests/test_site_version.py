"""Regression tests for site versions and merged histories."""
import importlib.util
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
        self.write_commit("README.md", "Baseline\n", "Initial commit")

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

    def test_missing_marker_fails_with_clear_error(self):
        with self.assertRaisesRegex(RuntimeError, "cronologia Git completa"):
            build_site.site_version()

    def test_direct_commit_starts_at_one_zero_zero(self):
        self.write_commit(".github/site-version-start", "1.0.0\n", "Start versions")
        self.assertEqual(build_site.site_version(), "1.0.0")
        self.write_commit("README.md", "Update\n", "Update content")
        self.assertEqual(build_site.site_version(), "1.0.1")
        self.write_commit("news.json", "{}\n", "News automatica: update")
        self.assertEqual(build_site.site_version(), "1.0.1")

    def test_merge_origin_and_version_rollover(self):
        self.git("checkout", "-b", "feature")
        self.write_commit(".github/site-version-start", "1.0.0\n", "Start versions")
        self.git("checkout", "main")
        self.git("merge", "--no-ff", "-m", "Merge feature", "feature")
        self.assertEqual(build_site.site_version(), "1.0.0")
        self.assertEqual(build_site.site_version(), "1.0.0")

        for number in range(1, 11):
            self.write_commit("README.md", f"Update {number}\n", f"Update {number}")
            if number == 5:
                self.write_commit("news.json", "{}\n", "News automatica: update")
            self.assertEqual(build_site.site_version(), f"1.{number // 10}.{number % 10}")


if __name__ == "__main__":
    unittest.main()
