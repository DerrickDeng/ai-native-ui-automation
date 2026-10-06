#!/usr/bin/env python3
"""Verify that an OpenViking source citation still matches its local source."""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote


SKILL_ROOT = Path(__file__).resolve().parents[1]


def emit(value):
    print(json.dumps(value, ensure_ascii=False, indent=2))


def within(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes configured root: {relative}")
    return path


def roots(args):
    config_path = Path(args.config).expanduser().resolve() if args.config else SKILL_ROOT / "connection.json"
    config = json.loads(config_path.read_text())
    root = (
        Path(args.root).expanduser().resolve()
        if args.root
        else (config_path.parent / config["requirements_root"]).resolve()
    )
    return root, within(root, config.get("wiki_root", "wiki"))


def manifest_entries(wiki_root):
    command = ["rg", "-l", "-0", "-F", "--glob", "*.json", "-e", '"import_uri"', "--", str(wiki_root)]
    try:
        process = subprocess.run(command, capture_output=True, timeout=20, check=False)
    except (FileNotFoundError, subprocess.TimeoutExpired) as error:
        raise ValueError(f"Cannot discover source manifests: {error}") from error
    if process.returncode not in (0, 1):
        raise ValueError(process.stderr.decode(errors="replace").strip())
    candidates = sorted(Path(value.decode()) for value in process.stdout.split(b"\0") if value)
    for path in candidates:
        try:
            data = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            continue
        sources = data.get("sources") if isinstance(data, dict) else None
        if not isinstance(sources, list):
            continue
        for item in sources:
            if isinstance(item, dict) and {"path", "sha256", "import_uri"}.issubset(item):
                yield path, item


def citation_uri(item):
    base = item["import_uri"].rstrip("/")
    name = Path(item["path"]).name
    return base if base.endswith("/" + name) else base + "/" + name


def verify(args):
    root, wiki_root = roots(args)
    citation = unquote(args.uri)
    matches = [(manifest, item) for manifest, item in manifest_entries(wiki_root) if citation_uri(item) == citation]
    unique = {}
    for manifest, item in matches:
        key = (item["path"], item["sha256"], item["import_uri"])
        unique.setdefault(key, {"item": item, "manifests": []})["manifests"].append(str(manifest))
    if not unique:
        emit({"uri": citation, "freshness": "unmapped"})
        return
    if len(unique) > 1:
        emit(
            {
                "uri": citation,
                "freshness": "ambiguous",
                "matches": [
                    {
                        "path": value["item"]["path"],
                        "sha256": value["item"]["sha256"],
                        "manifests": value["manifests"],
                    }
                    for value in unique.values()
                ],
            }
        )
        return
    value = next(iter(unique.values()))
    item = value["item"]
    path = within(root, item["path"])
    if not path.is_file():
        emit({"uri": citation, "path": str(path), "manifests": value["manifests"], "freshness": "missing"})
        return
    content = path.read_bytes()
    actual = hashlib.sha256(content).hexdigest()
    emit(
        {
            "uri": citation,
            "path": str(path),
            "manifests": value["manifests"],
            "expected_sha256": item["sha256"],
            "actual_sha256": actual,
            "freshness": "current" if actual == item["sha256"] else "changed",
            "content": content.decode(errors="replace"),
        }
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uri", required=True, help="Exact source citation URI from a Wiki page")
    parser.add_argument("--config", help="Connection JSON; defaults to this Skill's connection.json")
    parser.add_argument("--root", help="Override the requirements repository root")
    args = parser.parse_args()
    try:
        verify(args)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        emit({"error": str(error)})
        sys.exit(2)


if __name__ == "__main__":
    main()
