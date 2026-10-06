# Read-only query interface

Read `connection.json` from the Skill directory. Resolve `requirements_root` relative to the connection file; resolve `openviking_cli` and `wiki_root` relative to that requirements root. The file contains environment locations only, with no project registry or Story-prefix rules.

```sh
OV_CLI=/resolved/path/to/ov.sh
OV_RESOURCE_ROOT=viking://resources
DISCOVERED_WIKI_URI=viking://resources/discovered-wiki
RESULT_URI=viking://resources/discovered-wiki/relevant-page.md

"$OV_CLI" grep 'QAD-103' -u "$OV_RESOURCE_ROOT" -i -n 20 -o json
"$OV_CLI" find 'QAD-103 how skipped affects the flaky ranking' -u "$OV_RESOURCE_ROOT" -n 10 -L 1,2 -o json
"$OV_CLI" find 'how skipped affects the flaky ranking' -u "$DISCOVERED_WIKI_URI" -n 5 -L 2 -o json
"$OV_CLI" read "$RESULT_URI" -o json
"$OV_CLI" tree "$RESULT_URI" -L 2 -o json

python3 .claude/skills/requirement-context-retrieval/scripts/verify_source.py --uri '<source-citation-uri>'
```

Use exact Story matches, explicit project metadata, page content, and citations to determine whether the results belong to one Wiki. A URI name or result rank alone is insufficient. Once one Wiki is established, constrain subsequent commands to its URI. `grep`, `find`, `read`, and `tree` retain their native OpenViking behavior and JSON schema.

If a command fails with `UNAVAILABLE`, the local service is not running. Start it once. The script stays in the foreground, so run it in the background with its log outside the repository, then wait for `health`:

```sh
OV_START=/resolved/path/to/start.sh
nohup "$OV_START" > "${TMPDIR:-/tmp}/openviking-server.log" 2>&1 &
for i in $(seq 1 30); do "$OV_CLI" health -o json >/dev/null 2>&1 && break; sleep 2; done
"$OV_CLI" health -o json
```

Leave the service running for later questions and say that this run started it. If `health` still fails after the wait, read the log's last lines, then use the fallback below. A log line such as "port ... is already in use" means an older process holds the port. Do not kill it, because it may belong to the user; use the fallback and say why.

If OpenViking cannot be started or the native command fails for another reason, use the committed Markdown export:

```sh
WIKI_ROOT=/resolved/requirements/repository/wiki
rg -l -i -F -e 'QAD-103' -e 'flaky' -e 'skipped' --glob '*.md' -- "$WIKI_ROOT"
```

Read only the most relevant returned pages. Narrow the exact terms when too many pages match. Do not use fallback merely because OpenViking returned no match.

`verify_source.py` discovers JSON documents under `wiki/` that expose compatible `sources[]` entries and matches the exact citation URI. It accepts `--root` to override the requirements checkout and `--config` to use another connection. It returns the matching manifest paths, expected and current hashes, `freshness` (`current`, `changed`, `missing`, `unmapped`, or `ambiguous`), and current local text when present. A source being current only confirms that its bytes match the manifest; the agent must still read the cited passage and distinguish Story rules from note observations or questions.

Adding a project requires no Skill or connection change: import its sources and Wiki beneath the connected OpenViking resource root and keep its Markdown and provenance material under `wiki/`. The helper recognizes manifest `sources[]` entries with `path`, `sha256`, and `import_uri`. A corpus without equivalent provenance can still be explored through native OpenViking, but source freshness remains unverified.
