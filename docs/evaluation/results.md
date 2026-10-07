# Evaluation Results

These are the results of the agent evaluations in the
[methodology](methodology.md). We show small samples as passed checks, not as
success rates.

## playwright-bdd-step-implementor

Recorded on 2026-09-27. The executor is Claude Sonnet 5, and the grader is
Claude Opus 5.5. In each task, an authored scenario has a missing step. The
agent must implement it against the live QA Dashboard
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

Each task ran **once**. Agent time is the wall-clock time from the prompt to
the final report. It includes all test runs. The checks and the skill changed
after this run. We did not run the evaluation again on the current versions.

## playwright-bdd-test-healer

Recorded on 2026-09-29. The executor is Claude Sonnet 5, and the grader is
Claude Opus 5.5. In each task, a scenario passed before, and a QA Dashboard
change made it fail
(see [evals.json](../../.claude/skills/playwright-bdd-test-healer/evals/evals.json)).

| Task                | With the skill | Agent time      | Without the skill |
| ------------------- | -------------- | --------------- | ----------------- |
| 1 run-report        | 14 / 15        | 18.9 min        | not run           |
| 2 defect-summary    | 12 / 15        | 6.9 min         | not run           |
| 3 escape-rate       | 14 / 16        | 17.9 min        | not run           |
| 4 project-pass-rate | 13 / 15        | 9.9 min         | 8 / 15            |
| **Total**           | **53 / 61**    | median 13.9 min | —                 |

How to read this:

- Each configuration ran **once** for each task. The results show that the
  skill can do the work on these tasks. They are not a measured success rate.
- The run without the skill covers only task 4. It is one comparison point,
  not a baseline for all tasks.
- The checks are the checks in `evals.json` on that date (15 or 16 for each
  task). We added checks later, and the skill changed. We did not run the
  evaluation again on the current versions.

## Deterministic checks

`npm run test:skills` runs the hermetic fixture, framework-contract, and
skill-contract tests on each change: 42 / 42 pass.
