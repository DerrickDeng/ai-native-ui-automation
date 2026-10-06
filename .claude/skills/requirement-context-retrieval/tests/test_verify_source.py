import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


VERIFY = Path(__file__).resolve().parents[1] / "scripts/verify_source.py"


class VerifySourceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.wiki = self.root / "wiki"
        self.wiki.mkdir()
        self.note = self.root / "project-a/requirements/QAD-103/note.md"
        self.note.parent.mkdir(parents=True)
        self.note.write_text("Skipped qualification is unresolved.\n")
        self.digest = hashlib.sha256(self.note.read_bytes()).hexdigest()
        self.uri = "viking://resources/project-a-sources/QAD-103-note/note.md"
        self.write_manifest(
            "project-a/build-manifest.json",
            "project-a/requirements/QAD-103/note.md",
            self.digest,
        )
        self.config = self.root / "connection.json"
        self.config.write_text(json.dumps({"requirements_root": ".", "wiki_root": "wiki"}))

    def write_manifest(self, relative, path, digest):
        manifest = self.wiki / relative
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(
            json.dumps(
                {
                    "sources": [
                        {
                            "path": path,
                            "sha256": digest,
                            "import_uri": "viking://resources/project-a-sources/QAD-103-note",
                        }
                    ]
                }
            )
        )

    def run_verify(self, uri=None, success=True):
        result = subprocess.run(
            [
                sys.executable,
                str(VERIFY),
                "--uri",
                uri or self.uri,
                "--config",
                str(self.config),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode == 0, success, result.stderr + result.stdout)
        return json.loads(result.stdout)

    def test_current_changed_and_unmapped(self):
        self.assertEqual(self.run_verify()["freshness"], "current")
        self.note.write_text("The note changed.\n")
        self.assertEqual(self.run_verify()["freshness"], "changed")
        self.assertEqual(self.run_verify("viking://resources/other/x.md")["freshness"], "unmapped")

    def test_conflicting_manifests_are_ambiguous(self):
        other = self.root / "project-b/note.md"
        other.parent.mkdir()
        other.write_text("Different source.\n")
        self.write_manifest(
            "project-b/another-manifest.json",
            "project-b/note.md",
            hashlib.sha256(other.read_bytes()).hexdigest(),
        )
        result = self.run_verify()
        self.assertEqual(result["freshness"], "ambiguous")
        self.assertEqual(len(result["matches"]), 2)

    def test_manifest_path_cannot_escape_requirements_root(self):
        self.write_manifest("project-a/build-manifest.json", "../note.md", self.digest)
        result = self.run_verify(success=False)
        self.assertIn("escapes configured root", result["error"])


if __name__ == "__main__":
    unittest.main()
