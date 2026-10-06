# Step Implementor evaluations

This Skill is evaluated with Skill Creator's standard loop ("Running and
evaluating test cases" in its `SKILL.md`), with no extra tooling. This page
lists only what this repository needs on top of that loop.

- Test cases: [evals.json](evals.json). Each case has a prompt, the fixture
  files it needs, and the expectations the grader checks.
- Results: `.claude/skills/playwright-bdd-step-implementor-workspace/iteration-<N>/`
  (not committed).
- Regression: every case in `evals.json` runs in every iteration, and the
  viewer compares it with the previous iteration. To add a regression case,
  add a case (and its fixture) here.

## The application under test

The cases run against the real QA dashboard, cloned next to this repository as `../qa-dashboard`
(`qaDashboard` in `src/config/profiles.json`), not static pages. Its source is
outside this repository, so the executor cannot read the answer from it, and a
live app exposes real behavior: the first check of these fixtures found a
filter race in the dashboard itself (since fixed in qa-dashboard).

The fixtures sign in as the local account `eval-bot`; its password lives only
as ciphertext in each fixture's `steps.ts`. The person running the evals
creates the account and pastes the ciphertext; the agent never handles either.
The committed ciphertext only works with the author's local key, so set up your
own once:

```bash
openssl rand -hex 32 > .test-data-key                    # git-ignored
(cd ../qa-dashboard && make user-add NAME=eval-bot)      # prompts for a password
read -rs PW && printf '%s' "$PW" | npm run --silent encrypt; unset PW
```

Replace the `password` value of `EVAL_ACCOUNT` in every fixture's `steps.ts`
with the printed ciphertext (all fixtures share one account).

Before each round, check and record, and stop if any check fails:

1. `make up` in qa-dashboard is running: `curl -fsS http://127.0.0.1:8001/health`.
2. The newest demo run is from the last three days; otherwise run `make demo`
   (it adds data and keeps accounts).
3. The qa-dashboard commit (`git -C ../qa-dashboard log -1 --format=%h`).
   If it changed since the last round, compare the two rounds with care.

## What this repository adds to the loop

**One run at a time.** Runs cannot overlap: the Skill stops any running
`playwright test` process before it starts its own, and every run attaches the
same machine-wide debug session name, `-s=bdd-step`.

**Isolation.** Every executor sub-agent runs with `isolation: "worktree"`, so
each run starts from a clean `HEAD`, whatever uncommitted work the main
checkout holds.

**Keep the executor blind.** The executor must never see the expectations,
the workspace, or earlier runs. Two runs were lost to leaks: one copied a
fixture from the worktree's `HEAD` that still held an answer comment, and one
read `eval_metadata.json` next to its outputs folder. So:

- Before the runs, copy `evals/fixtures/` and a `node_modules` link to a
  staging folder outside the repository (a scratchpad).
- The run prompt names only that staging folder. It never names the main
  checkout or the workspace, and it tells the executor to read nothing outside
  its worktree and the staging folder.
- Deleting the worktree's `evals/` folder does not remove it from git history.
  Every version of `evals.json` and every fixture, including this Skill's
  fixtures (finished versions of steps a healer case breaks), is one
  `git show` away. The run prompt forbids reading other commits. A healer run
  once searched the history with `git log --all -p` and stopped one command
  short of reading a finished step.
- Fixtures must not hint at the answer: no revealing case names, step text,
  or code comments. An earlier static-page case named `impossible-content`
  said the content was missing on purpose, and the agent then called the red
  Scenario "expected".
- For `with_skill`, the run prompt makes loading the Skill (Skill tool) the
  first action, before setup, as in real use. When setup ran first, the
  harness, not the Skill, set the habits for the whole run.
- Setup is one exact command block the executor runs as written: link
  `node_modules` from staging, delete the worktree's own `evals/` folder, copy
  the two files, run `npx bddgen`. Stage one case at a time: every fixture
  defines the same sign-in step, so two staged together are ambiguous.

| Staged file               | Copy to                                   |
| ------------------------- | ----------------------------------------- |
| `<name>/scenario.feature` | `src/features/_skill-eval/<name>.feature` |
| `<name>/steps.ts`         | `src/steps/_skill-eval/<name>.steps.ts`   |

**Cases that need requirement context (`pass-rate-check`, `failing-not-flaky`).**
They test whether the executor loads `requirement-context-retrieval` by itself.
`pass-rate-check` gets the pass-rate rule from Story QAD-102.
`failing-not-flaky` has a red check that the QAD-103 note says is not
guaranteed, so the right handoff is a question for the Scenario's owner, not a
dashboard defect. Neither prompt mentions the retrieval Skill. Neither case can
tell a right formula from a wrong one: the page is correct, so a baseline can
work the rule out from the page. They measure whether the rule was looked up,
checked against its source, and named in the handoff. It needs three things on top of the steps above:

- Both Skills must be committed. A worktree starts from `HEAD` and would not
  have an untracked `requirement-context-retrieval/`.
- The OpenViking service may be up or down. The Skill starts it once if it is
  down, so either state is a valid start. Check only that the login store
  exists (`../requirement_testcase_agent/wiki/.local/codex_auth.json`); without
  it the start fails and the run falls back to Markdown. After the round, stop
  a service the executor started. If the start fails with "port 19331 is
  already in use", an older `vikingbot` from a past server run is still bound
  (check with `lsof -nP -iTCP:19331 -sTCP:LISTEN`); stop it yourself before the
  round if you want the main route tested. The executor must not kill it.
  Check also that the latest day on the Execution page has both flaky and
  skipped tests (`flaky > 0` and `skipped > 0`). The qa-dashboard demo
  generator must carry the `skipped` scenario ("a statement can be exported to
  CSV" under Statements), or `make demo` brings back data with no skipped
  tests. With no skipped tests, a
  formula that divides by `Total tests` gives the same rate, and the case
  cannot fail.
- The committed `connection.json` points at the requirements checkout by a
  relative path that is wrong inside a worktree. After the setup block, add
  one line that rewrites it with the absolute path of the checkout (same keys,
  only `requirements_root` changes).

Add to the executor prompt: the requirements checkout may be read only through
the commands of a Skill you have loaded, and `testcases/` and `wiki/evaluation/`
in it are off limits (they hold finished answers). Do not name the retrieval
Skill anywhere in the prompt. Rounds 15 to 19 named it in this sentence, so
their "loaded it on its own" result is weaker than it reads. When scanning the trace, also look for
reads there. Stage this case alone, like the others.

**Baseline.** Only the first iteration of a case set runs a baseline. Its job
is to find cases and expectations that pass without the Skill, so they can be
fixed or removed. `without_skill` gets the same prompt without the words that
name the Skill and is told not to use the Skill tool; the Skill still sits in
`.claude/skills/`, so the grader must confirm it was not loaded. Later
iterations run `with_skill` only and compare with the previous iteration. To
ask whether a new Skill version beats the old one, use Skill Creator's
`old_skill` snapshot as the baseline.

**Outputs.** The executor saves into `eval-outputs/` inside its own worktree,
without changing git staging: the diff of `src/`, every file it created or
changed there, the final focused test output, and its handoff. Copy that
folder to the run's `outputs/` after it finishes.

**Layout for the viewer.** Put each run in `<config>/run-1/` (the aggregate
script requires it) and copy `eval_metadata.json` into each `<config>/` folder,
with the prompt that configuration actually received; the viewer looks for it
only in the run folder and its parent.

**Grading.** Give the grader the sub-agent's raw trace
(`~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl`) as the
transcript, and say it is a JSON Lines session log. A markdown conversion
cuts long tool results and loses evidence. Ask the grader to write every
human-readable string in `grading.json` in plain Chinese, keeping code, paths,
commands, and rule IDs verbatim; `expectations[].text` may stay as in
`evals.json`. Write the analyst notes in `benchmark.json` in Chinese too. Check file facts from `outputs/`,
never from the executor's own report.

**Fixture lint findings.** Each fixture `steps.ts` keeps an inline Page class,
the raw `page` fixture, and an `@playwright/test` import, so `npm run lint`
fails on it. These are scaffolding, not agent errors. Either reporting them as
pre-existing or moving the logic into a compliant Page Object is acceptable.
For `defect-tiles`, implementing the exact check and leaving the Scenario red is the right result.

## Prompt templates

Placeholders: `<S>` staging folder, `<name>` case, `<task>` the case's `prompt`
from `evals.json` (for `without_skill`, with the words naming the Skill
removed), `<run>` the run folder, `<fixtures>` this folder's `fixtures/`.

**Executor** (sub-agent, `model: sonnet`, `isolation: "worktree"`):

````markdown
Execute this task.

Your working directory is a fresh git worktree of the repository. Read and change nothing outside your worktree, except reading the staging folder named in the setup block and using the local QA dashboard through a browser or test run. Do not read other commits: no `git log -p`, `git show`, or `git diff <commit>`.
[without_skill only:] Do not use the Skill tool, and do not read anything under `.claude/skills/`.

[with_skill only:]

## First action: load the skill

Before anything else, load the `playwright-bdd-step-implementor` skill with the Skill tool, and follow it for everything that comes after, including the setup below.

## Setup (it is not part of the task)

From your worktree root, run this block exactly as written, as one Bash command. Do not retype the paths.

```bash
S=<S>
E=.claude/skills/playwright-bdd-step-implementor/evals
T=<name>
set -e
[ -e node_modules ] || ln -s "$S/node_modules" node_modules
rm -rf "$E"
mkdir -p src/features/_skill-eval src/steps/_skill-eval
cp "$S/$T/scenario.feature" "src/features/_skill-eval/$T.feature"
cp "$S/$T/steps.ts" "src/steps/_skill-eval/$T.steps.ts"
npx bddgen
```

It must succeed. If it fails, stop and report the failure.

## Task

- Task: <task>
- Input files: the two files copied in setup.

## Save outputs

When done, save into `eval-outputs/` at your worktree root (do not change git staging to do this):

- `changes.diff`: `git diff -- src`, then append `git diff --no-index /dev/null <file>` for each file listed by `git ls-files --others --exclude-standard -- src`
- `git-status.txt`: `git status --short -- src`
- the full content of every file you created or changed under `src/`, copied with its path flattened (e.g. `src__pages__Foo.ts`)
- `final-test.txt`: output of the last focused test run, if any
- `handoff.md`: your final report to the user, exactly as you would give it

Then give that same final report as your reply.
````

**After each run:** copy the worktree's `eval-outputs/` to `<run>/outputs/`,
the sub-agent's `.jsonl` trace to `<run>/transcript.jsonl`, and `total_tokens`,
`duration_ms`, and tool uses from its result to `<run>/timing.json`; confirm no
`playwright test` process is left; scan the trace for reads of the workspace,
`evals.json`, or other commits (`git log -p`, `git show`). Scan tool outputs as
well as commands: a `git log` over history or a broad `grep` can print
expectations the command never names. A leak voids the run. Remove the run
worktrees after the round.

**Grader** (sub-agent, `model: opus`):

```markdown
You are the grader. Follow the instructions in this file exactly: <Skill Creator>/agents/grader.md

Inputs:

- expectations: the `assertions` array in <run>/../../eval_metadata.json
- transcript_path: <run>/transcript.jsonl — a JSON Lines session log (one JSON message per line: assistant tool_use calls with their inputs, including Bash `command` and `description`; user tool_result entries; the final assistant text is the handoff). Search it with grep/jq or a small script rather than reading it whole, but do not skip tool results.
- outputs_dir: <run>/outputs

Context:

- WITH-SKILL or BASELINE run against the live QA dashboard, in a temporary git worktree. Loading the skill first, the setup block, and the output-saving commands at the end are harness steps.
- [BASELINE only:] First record in `skill_usage_note` whether it actually invoked the Skill tool (a tool_use block named "Skill") or read the skill's files. Do not fail an expectation only because the skill was not used. Expectations that describe a debug session fail if no `--debug=cli` session ran; temporary dump code in a normal run is not one.
- [Any facts you noticed in the executor's report that need checking, stated as facts to verify.]
- Fixture originals: <fixtures>/<name>/ — for "byte-identical" and "pre-existing" checks. Its steps.ts holds an encrypted password; do not decrypt it or copy it into grading.json.
- Coding rules: CodeRules.md in the repository root (X-2 covers fixture entries only).
- Check file facts from outputs_dir and the transcript's tool results, never from the executor's own report.
- One standard for "plain handoff": a skill-internal term (checkpoint, guarded, pause point, gate, binding, ctx) fails it; a handoff dominated by code jargon also fails.
- Keep `expectations[].text` exactly as given. Write every other human-readable string in grading.json in plain, natural Chinese with short sentences; keep code, paths, commands, locators, and rule IDs verbatim.

Write grading.json as grader.md says (sibling of outputs_dir), with fields `text`, `passed`, `evidence`. Reply in Chinese with a short summary.
```

**After a round:** run Skill Creator's `aggregate_benchmark`, then fix by hand
what it gets wrong: `tokens` and `tool_calls` from each `timing.json`, the
model names, and `runs_per_configuration`. Write the analyst notes in Chinese
into `notes`, then generate the viewer with `--static` (add
`--previous-workspace` when the previous iteration used the same cases).
