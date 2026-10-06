# Evaluation Results

Results of the Agent evaluations described in the [methodology](methodology.md).
Small samples are reported as passed checks, not as success rates.

## playwright-bdd-test-healer

Recorded on 2026-09-29. Executor: Claude Sonnet 5; grader: Claude Opus 5.5.
Each task is a previously-green scenario that a QA Dashboard change has broken
(see [evals.json](../../.claude/skills/playwright-bdd-test-healer/evals/evals.json)).

| Task                | With the Skill | Without the Skill |
| ------------------- | -------------- | ----------------- |
| 1 run-report        | 14 / 15        | not run           |
| 2 defect-summary    | 12 / 15        | not run           |
| 3 escape-rate       | 14 / 16        | not run           |
| 4 project-pass-rate | 13 / 15        | 8 / 15            |
| **Total**           | **53 / 61**    | —                 |

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
