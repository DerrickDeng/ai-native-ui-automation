---
name: requirement-context-retrieval
description: Retrieve and verify requirement context from a project Wiki and its cited Story or note sources when an agent must resolve a business question. Use for implementation or test-design context; do not use to generate or update the Wiki.
metadata:
  short-description: Find source-grounded requirement context
---

# Requirement Context Retrieval

Answer one bounded business question from a configured requirements Wiki. The Wiki helps locate and combine evidence; the cited Story, AC, and note determine what the source actually says. This skill works with a small or large corpus by narrowing the question and source, retrieving candidates, and expanding only where evidence is missing.

## Inputs and discovery

Start with the current task, its Feature or Story ID if present, and the precise decision that needs context. Read `connection.json` to obtain the requirements checkout, OpenViking CLI and start script, root resource URI, and local Wiki root. Resolve `requirements_root` relative to that file and the other paths relative to the requirements root. This connection contains no project names, Story prefixes, or Wiki registry. Use an environment-specific connection when the checkout is elsewhere.

Discover the relevant project from the task evidence and OpenViking results. Do not infer ownership solely from a naming convention. If the results do not identify one relevant Wiki, report that context is ambiguous or unavailable. Continue only where the authored task already supplies enough evidence; do not guess an association.

## Retrieval loop

1. Locate relevant material under the OpenViking root. When a Story ID is present, use native `grep` for the exact ID and `find` with the ID plus the business question. Without an ID, use the explicit project evidence and distinctive Feature terms. Preserve OpenViking's native results and ranking.
2. Inspect candidate URIs and content. When the evidence identifies one Wiki subtree, restrict the next `find` to that URI. If candidates span plausible projects and the task provides no discriminator, stop rather than selecting by prefix, folder name, or result order.
3. Read the most relevant URI with native `read`. Use native `tree` only when the page points to a related topic that must be explored. Reformulate the query when needed; do not load the entire corpus.
4. When a command reports the service is unreachable (`UNAVAILABLE`), start it once with the start script from `connection.json`, wait for `health`, and retry the command. Run only that script; never run install or auth bootstrap scripts. Say in the brief that this run started the service. Use Markdown fallback only when the start fails (for example, no stored login) or the command fails for another reason. Use `rg` with the Story ID and distinctive exact terms across the connected Wiki root, then read only the relevant Markdown files. This fallback applies no project mapping. An empty successful OpenViking result is not a service failure and does not trigger fallback.
5. For each conclusion that could change the implementation, run `python3 .claude/skills/requirement-context-retrieval/scripts/verify_source.py --uri '<viking-source-citation>'`. The script discovers compatible manifests under `wiki/`, reads the referenced local Story or note, and compares its SHA-256. Inspect the relevant AC or passage in that output. Treat an ambiguous, changed, missing, or unmapped source as unresolved; do not present the Wiki conclusion as current.
6. Expand to another Story or note only when the retrieved page or original source gives a concrete relationship. Stop when the question is answered with current evidence, or when another query is unlikely to resolve a named gap. Record a conflict or absence rather than inventing a rule.

OpenViking owns discovery, search, navigation, and page reads. `rg` provides the offline fallback. The only helper script verifies local source freshness; it contains no project-routing rules and never calls OpenViking, compiles, edits, imports, or snapshots content. See [the query interface](references/query-interface.md) for commands.

## Evidence returned to the calling agent

Give a short context brief containing the question, the relevant rule or distinction, exact source paths and versions, Wiki pages used, and any conflict, inference, unknown, or stale citation. State `not found` when no supported answer emerged. A Wiki summary alone is not proof of a business rule. Do not add acceptance criteria or test assertions that the authored Feature or Story did not request.

For a BDD step, the authored Gherkin determines implementation scope. This skill supplies context for a decision inside that scope; repository coding rules, the runner, and live browser evidence still own their respective questions.
