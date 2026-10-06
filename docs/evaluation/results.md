# Evaluation Results

Results of the Agent evaluations described in the [methodology](methodology.md).
Small samples are reported as passed checks, not as success rates.

## playwright-bdd-step-implementor

Recorded on 2026-09-27. Executor: Claude Sonnet 5; grader: Claude Opus 5.5.
Each task is an authored scenario with a missing step that the Agent must
implement against the live QA Dashboard
(see [evals.json](../../.claude/skills/playwright-bdd-step-implementor/evals/evals.json)).

| Task                 | Checks passed | Agent time     |
| -------------------- | ------------- | -------------- |
| 1 defect-tiles       | 15 / 16       | 6.7 min        |
| 2 defect-escape-rate | 16 / 17       | 6.6 min        |
| 3 filter-narrowing   | 14 / 15       | 5.7 min        |
| 4 section-tour       | 18 / 20       | 7.6 min        |
| 5 run-report-build   | 14 / 18       | 15.7 min       |
| 6 run-filters        | 13 / 16       | 8.6 min        |
| 7 tile-counts        | 19 / 19       | 7.3 min        |
| **Total**            | **109 / 121** | median 7.3 min |

Each task ran **once**. Agent time is wall-clock time from the prompt to the
final report, including every test run. The checks and the Skill have changed
since; these results have not been re-run against the current versions.

## playwright-bdd-test-healer

Recorded on 2026-09-29. Executor: Claude Sonnet 5; grader: Claude Opus 5.5.
Each task is a previously-green scenario that a QA Dashboard change has broken
(see [evals.json](../../.claude/skills/playwright-bdd-test-healer/evals/evals.json)).

| Task                | With the Skill | Agent time      | Without the Skill |
| ------------------- | -------------- | --------------- | ----------------- |
| 1 run-report        | 14 / 15        | 18.9 min        | not run           |
| 2 defect-summary    | 12 / 15        | 6.9 min         | not run           |
| 3 escape-rate       | 14 / 16        | 17.9 min        | not run           |
| 4 project-pass-rate | 13 / 15        | 9.9 min         | 8 / 15            |
| **Total**           | **53 / 61**    | median 13.9 min | —                 |

How to read this:

- Each configuration ran **once** per task. This shows the Skill can do the
  work on these tasks; it is not a measured success rate.
- The run without the Skill covers task 4 only, so it is a single comparison
  point, not a baseline for the whole set.
- The checks were the ones in `evals.json` on that date (15 or 16 per task).
  Checks were added later, and the Skill has changed since; these results have
  not been re-run against the current versions.

## Deterministic checks

`npm run test:skills` runs the hermetic fixture, framework-contract, and
Skill-contract tests on every change: 42 / 42 pass.
