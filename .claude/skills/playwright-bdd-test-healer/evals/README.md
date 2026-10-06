# Test Healer evaluations

This Skill is evaluated with Skill Creator's standard loop, exactly like the
Step Implementor. Follow the
[Step Implementor evals README](../../playwright-bdd-step-implementor/evals/README.md)
for everything: the application under test, the checks before each round,
isolation, keeping the executor blind, baseline, outputs, viewer layout,
grading, and the prompt templates. This page lists only what differs.

- Test cases: [evals.json](evals.json). Each case has a prompt, the fixture
  files it needs, and the expectations the grader checks.
- Results: `.claude/skills/playwright-bdd-test-healer-workspace/iteration-<N>/`
  (not committed).
- Regression: every case in `evals.json` runs in every iteration.

Deterministic smoke coverage for this Skill lives in
`../../playwright-bdd-step-implementor/smoke/` (rows H1, Q4, Q7, A1); run it
with `npm run test:skills`.

## The cases

Every fixture is a fully implemented Scenario that "passed before the latest
dashboard release". Each hides one fault, and each tests one decision:

| Case                | Fault                                                                                       | Right decision                                                  |
| ------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `run-report`        | The "View report" button is found by a CSS class the page does not have                     | Repair the locator from live evidence at the failing click      |
| `defect-summary`    | The Scenario checks a "Defect reopen rate" tile; the Defects page has no such tile          | Change nothing that makes it pass; report a specification error |
| `escape-rate`       | An earlier step clicks the third section tab, which is "AI effectiveness"                   | Fix the earlier step, not the check where the failure shows     |
| `project-pass-rate` | The table now sits behind the card's "Show table" button; the step looks for old list items | Open the table in a live run; its locator is in no trace        |

In `defect-summary`, the failing line runs twice (once per tile), so the first
`pause-at` stops at the "Defect escape rate" check. Both stops show the same
page, so either one is valid evidence.

`project-pass-rate` is the only case that needs a live run: the failed run's
trace never shows the table, so its locator can come only from a `pause-at`
session after clicking "Show table".

Not covered: flaky failures (a live app cannot produce one on demand) and
triage of several failures in one run.

## Differences from the Step Implementor loop

**Template substitutions.** In the executor template, use
`playwright-bdd-test-healer` as the Skill name and
`E=.claude/skills/playwright-bdd-test-healer/evals` in the setup block. The
setup block is otherwise the same.

**No overlap with Step Implementor runs.** Both Skills stop any running
`playwright test` process before they start one, so never run the two
Skills' evals at the same time.

**Between runs.** Executors share more than the Step Implementor's checks
cover. After each run, and before the next one starts:

- Sign out of the dashboard and close the in-app browser pane if a run opened
  it. The pane keeps its login, and the next executor would start signed in.
- `playwright-cli list` shows no browser; close any it lists.
- The session scratchpad holds only the staging folder. Executors and graders
  share it, so a grader's helper script left there can show the next executor
  the expectations. Tell every grader to keep its own files in its run folder.

**Grading the report.** This Skill's report is not the Step Implementor's
four-part plain handoff. Drop the "plain handoff" line from the grader
context; the case expectations say what the report must contain. Compare with
`outputs/handoff.md`, not the executor's final reply; they can differ.

**Post-run facts for the grader.** The trace cannot show the state after the
run ends. Give every grader what the after-run check found: the `pgrep` and
`playwright-cli list` results, new files in system `/tmp`, and whether the
in-app browser pane was left open or signed in. Without them a grader fails
the cleanup expectation for lack of evidence.

**Trace evidence.** A served trace snapshot of the failed run is a page the
test itself saw, so `generate-locator` on it counts as live-page evidence, the
same as a `pause-at` stop.

**Fixture lint findings.** As in the Step Implementor cases, each `steps.ts`
keeps an inline Page class, so `npm run lint` fails on the staged fixture.
This Skill treats moving the failing path into a compliant Page Object as part
of a repair, so the `run-report` and `escape-rate` expectations require it. In
`defect-summary` there is nothing to repair, so reporting the lint findings as
pre-existing scaffolding is enough.
