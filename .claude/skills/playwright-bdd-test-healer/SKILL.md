---
name: playwright-bdd-test-healer
description: Fix previously-green playwright-bdd tests that now fail (broken locators, timing, changed assertions after a site/app change) by reading what the failed run left behind (failure report, error-context snapshot, trace) and stopping a Playwright CLI debug run only when a live page is needed. Use when the user says "fix the failing tests", "repair the broken scenarios", "the tests went red", or a regression run went red. NOT for missing step definitions — that is playwright-bdd-step-implementor's job.
---

# Playwright-BDD Test Healer

Fix broken playwright-bdd tests. A failed run already leaves most of the evidence behind: the failure report names the failing line, the error-context file holds the page at the moment of failure, and the trace holds the page before and after every action. Read those first. Start a new run only when you need a live page to interact with.

## Principles

1. **BDD text is frozen.** If the only way to make a test pass is changing step text or scenario structure, that is a spec change — stop and report. `git diff src/features/` must be empty at the end.
2. **Never edit `tests/.features-gen/**`.** Regenerated output; fixes there evaporate on the next `bddgen`.
3. **Steps delegate, POs assert.** Locator and assertion fixes land in Page Object methods; eslint `playwright/no-standalone-expect` enforces it. Step callbacks are `async function ({...}) {}`, and locator values live in a `locators` constant above the Page Object class. Follow `CodeRules.md`.
4. **A class declared in `src/steps` is not a compliant Page Object.** If the failing path has browser logic sitting in a step, moving it is part of the repair, not a separate refactor: the concrete Page Object lives in `src/pages/`, extends `BasePage`, declares `constructor(pageContext: PageContext, private readonly profile: TestProfile)` with `super(pageContext)`, and is registered as a typed fixture in `src/fixtures/bddTest.ts`. The smallest edit is not the smallest compliant repair.
5. **Never hide a failure.** No `test.fixme()`, skip, tag, retry, or fixed wait. If the code is right and the page genuinely lacks the expected content (confirm with two independent sources, such as snapshot + DOM query + screenshot), stop and report it with the evidence; that is a spec or data error the user decides on.
6. **Locators come from tool output.** Every changed locator traces to a Playwright CLI action echo, `generate-locator` (on a trace snapshot or a live pause), or the bounded test-id query, in the implementor's [locator order](../playwright-bdd-step-implementor/SKILL.md#adaptive-evidence). Never copy one from snapshot text or the error-context file.
7. **One combo, serial.** Every run uses `--project=<region>-<env>`, the same combo that went red. The config pins `workers: 1` and local Chrome; never override either.
8. **Evidence comes from the test's own run.** Use the failure report, the error-context file, the trace, and the paused test runner. Never open the application in another browser (the in-app browser pane, your own Chrome, or `playwright-cli open` on the app's URL) and never sign in by hand. The test signs in with its own code, so you never need the test account's password: do not decrypt or print it. The application's source code and API responses are not evidence of what the page showed.

## Phase 1 — Preflight & triage

```bash
npx bddgen                                # must exit 0; config load needs no project
npm test -- --project=<region>-<env>      # e.g. hk-sit; a run without --project fails in globalSetup
```

- `bddgen` exit 1 with `Missing step definitions` → wrong skill. Hand over to `playwright-bdd-step-implementor` and stop.
- **Heal against the combo that went red.** Each project carries a frozen profile (URLs, data) from `src/config/profiles.json`, so a fix verified on the wrong combo proves nothing. If the user didn't name the combo, ask or check the failing report.
- For each failure, read three things from the report: the error, the failing source line (`at src/pages/...:<line>`), and `test-results/<test>/error-context.md`, which holds the page snapshot at the moment of failure. Then classify by error shape:
  - **Flaky-shaped** (timeout/network on a step that usually passes) → re-run just that test once with `--grep "<scenario title>"`. Green on retry → note as flaky, drop from the fix queue.
  - **Everything else** → fix queue. The snapshot often shows the cause (the button was renamed, a dialog covers the page), but it is not locator evidence (Principle 6).

## Phase 2 — Find the cause, cheapest evidence first

Fix one failure at a time. Take evidence from the first layer that can answer the question, and move down only when it cannot:

| Layer | Source                                      | What it gives                                                                  | Cost                      |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| 1     | Failure report and error-context file       | The error, the failing line, the page at the moment of failure                 | None; read it in Phase 1  |
| 2     | The failed run's trace                      | Every action in order, the page before and after any action, verified locators | No new run, no sign-in    |
| 3     | A `--debug=cli` run stopped with `pause-at` | A live page you can interact with                                              | A new run of the Scenario |

### Layer 1 — Read the report and the error-context file

You already read both in Phase 1. They are often enough to say what went wrong: the error names the failing call, and the error-context file shows the page at that moment (a renamed button, a missing tile, another section showing). They are never enough to write a fix: the error-context file is page text, not locator evidence (Principle 6), and it shows only the moment of failure, not the steps before it. So go to Layer 2 when you need a locator, or when the page at failure is not the page the step expects.

### Layer 2 — Read the trace

Local runs record a trace at `test-results/<test>/trace.zip`, next to the error-context file. CI runs do not, so reproduce a CI failure locally first; the Phase 1 run already does. Playwright's own [trace skill](../playwright-trace/SKILL.md) documents the trace commands: `open`, `actions`, `action <number>` (which lists the snapshots an action has), `errors`, `requests`, `console`, and `close`. Read it for anything this section does not cover.

One thing differs in this repo. Playwright's `trace snapshot <number>` needs a headless browser this repo does not install, so it fails here. Serve the snapshot instead and open it with Playwright CLI:

```bash
npx playwright trace snapshot <number> --name after --serve > <scratchpad>/trace-serve.log 2>&1 &
playwright-cli -s=bdd-heal open <URL printed in trace-serve.log>
playwright-cli -s=bdd-heal snapshot > <scratchpad>/page.txt    # then grep this file
playwright-cli -s=bdd-heal generate-locator <ref>
```

To look at another snapshot, stop the `--serve` process, serve the new one, and `goto` its URL in the same session.

- **Start at the failing action's `after` snapshot.** For a check or action that timed out, that is the page when it gave up. Its `before` snapshot can still show the page loading, because the test moves on as soon as the previous action returns. Look there first, even when you suspect an earlier step.
- **Walk back when the page is wrong.** If that page is not the one the step expects (another section, a dialog on top, a sign-in form), look at earlier actions' `before` and `after` snapshots. The first action that leads away from the expected page is in the step to fix; the failing line only reported it.
- **A served snapshot is a static copy.** Read it, query it with `run-code`, and run `generate-locator` on it; clicking does nothing. A locator generated on it is tool output (Principle 6).

### Layer 3 — Stop the live run at the failing line

Use a live run only when the recorded pages cannot answer: the element appears only after an interaction (a hover, an open menu), the problem is timing (what loads when), you must see what an action does, or there is no trace. Playwright CLI's own [skill](../playwright-cli/SKILL.md) documents its commands (ref commands such as `click e5`, `generate-locator`, `run-code`, `snapshot --filename`) and, in [Running Playwright Tests](../playwright-cli/references/playwright-tests.md), the general `--debug=cli` flow. This section adds what this repo needs on top.

Start a debug run of that one scenario, redirected to a log file:

```bash
pgrep -fl "playwright test"   # must print nothing; stop any leftover runner first
npx playwright test --project=<region>-<env> --grep '<exact scenario title>' \
  --workers=1 --debug=cli > <scratchpad>/bdd-heal.log 2>&1 &
```

The log prints a session such as `tw-abcdef` once the test pauses at its start. Attach, then run to the failing line from Phase 1:

```bash
playwright-cli -s=bdd-heal attach tw-abcdef
playwright-cli -s=bdd-heal pause-at src/pages/<system>/<Page>.ts:<line>
```

`pause-at` stops only on a line that makes a browser call, such as a click, a fill, a `goto`, or an `expect`. The failing line from the report is always one. A line without a browser call (a closing brace, a step definition's first line, the generated spec's `await When(...)`) never stops, and the test runs on to its failure. If `pause-at` answers `Session closed`, check the line number first.

When the output says `Paused - <Action> at <file>:<line>`, the call has not run yet. If that line runs more than once before it fails (a shared helper, a method two steps call), send the same `pause-at` again to reach the next run; stop when the page matches the snapshot in the error-context file. At the pause, gather evidence with `snapshot`, `generate-locator`, and ref commands. `run-code` only reads here; it never clicks, fills, or navigates, because that would change the page the runner owns without an action echo.

The running test does not load saved edits, so `resume` only replays the old failure.

### Content the page does not have

When the expected element is absent from the failing action's page, confirm it with a second independent source before reporting: a `run-code` text query on the same snapshot, the action's screenshot (`npx playwright trace screenshot <number> -o <scratchpad>/shot.png`), or a live pause. Then change nothing that would make the check pass, and report a specification or data error for the Scenario's owner. Never call the red result expected.

### Repair

- Edit `src/**`. If you change a step definition's fixture list, the next run needs `npx bddgen` first, or the stale spec throws `Cannot read properties of undefined`.
- Bound every retry or wait you add. `expect(...).toPass()` has no default timeout, so a timing fix is the easiest place to write a hang.

### End the session

Before Phase 3, close everything this phase opened:

```bash
playwright-cli -s=bdd-heal close
pkill -f "playwright trace snapshot"
pkill -f "playwright test"
sleep 2; pgrep -fl "playwright (test|trace)"   # must print nothing; processes take a moment to exit
playwright-cli list                            # must show no browser
npx playwright trace close
```

## Phase 3 — Verify & report

```bash
npm run lint
npm test -- --project=<region>-<env> --grep "<scenario title>"   # same combo as Phase 1, no --debug
git diff --stat src/features/      # must be empty
git diff --stat tests/             # only .features-gen churn from bddgen, no hand edits
```

**Verify narrow, stop there.** Re-run the scenarios you actually fixed. Once they are green, do not run the entire selected project or unrelated scenarios to "make sure" — a full sweep costs minutes of real browser time and surfaces pre-existing failures that then read as yours. If a changed shared PO method has other direct callers (find them with `rg`), run only those scenarios, each with its own `--grep`. Run the whole project only when the user asks for it.

Grep the diff for `fixme` — none may appear.

Report: failures found → fixed / flaky / spec-error (with evidence), files changed, root cause per fix (one line each), run command, confirmation features are byte-identical. Spec errors go to the user verbatim — never paper over them.

## Gotchas

Each item below is a mistake observed in real runs. Add to this list when a new one appears.

- **Opening the app in another browser to look around.** It needs a manual sign-in, and in 4 of 6 evaluation runs that led the agent to decrypt and print the test account's password. The trace shows the same pages without signing in (Principle 8).
- **Starting from the suspected cause instead of the failing action.** An agent paused at the click it suspected and never saw the page the failing check saw. Look at the failing action's page first, then walk back.
- **Deciding the content is missing before looking at the failing action's page, or calling the red result "expected".** Confirm absence with two sources, then report it as a specification or data error.
- **`pause-at` one line off.** A line with no browser call never stops; the test runs to its failure and the CLI reports `Session closed`. Copy the line number from the failure report.
- **Piping the debug runner or any `playwright-cli` command through `head` or `tail`.** A cut output hides the session name or where the test stopped, and killing a piped runner can leave it paused in the background. Redirect the runner to a log file, save `snapshot` output to a file and grep it, and read other CLI output whole.
- **Leaving a `playwright-cli` browser open.** Run the [end-the-session block](#end-the-session); `playwright-cli list` must show no browser.

## Boundary with the implementor skill

| Situation                                   | Skill                                                 |
| ------------------------------------------- | ----------------------------------------------------- |
| `bddgen` reports missing steps              | playwright-bdd-step-implementor                       |
| Steps all bound, tests fail                 | this skill                                            |
| Mid-implementation, an older step regresses | implementor's own pause triage (do not switch skills) |
| Green test, user wants a better locator     | implementor's Revisit section                         |
