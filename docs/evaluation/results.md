# Evaluation Results

These are the results of the agent evaluations in the
[methodology](methodology.md). The samples are small, so we show passed checks,
not success rates.

## Summary

| Skill                           | Without the skill | With the skill | Sample          | Date       |
| ------------------------------- | ----------------- | -------------- | --------------- | ---------- |
| playwright-bdd-step-implementor | 13 / 36           | **34 / 36**    | 2 tasks × 1 run | 2026-10-01 |
| playwright-bdd-test-healer      | 8 / 15            | **13 / 15**    | 1 task × 1 run  | 2026-09-29 |

Both configurations use the same task and the same repository, with the same
`CLAUDE.md` and `CodeRules.md`. Only the skill is different.

## playwright-bdd-step-implementor: with and without the skill

- **Date:** 2026-10-01
- **Executor:** Claude Sonnet 5.5. **Grader:** Claude Opus.
- **Task:** implement a missing step against the live QA Dashboard.
- **Sample:** 2 tasks, 1 run for each configuration.

| Task                | Without the skill | With the skill    |
| ------------------- | ----------------- | ----------------- |
| 8 pass-rate-check   | 6 / 19 (2.0 min)  | 17 / 19 (4.3 min) |
| 9 failing-not-flaky | 7 / 17 (12.2 min) | 17 / 17 (5.1 min) |
| **Total**           | **13 / 36**       | **34 / 36**       |

Without the skill, the agent failed in the same places in both tasks:

- It did not look up the business rule in the requirement wiki. In task 8 it
  built the wrong pass-rate check: it counted flaky tests as passed.
- Its locators did not come from live page evidence.
- It broke safety rules: it wrote files outside its worktree, and in task 8 it
  tried to read the password of the test account outside the test code.

Later on the same day, the skill changed again. With the last version, the
skill passed 35 / 36 checks on the same two tasks.

## playwright-bdd-step-implementor: all tasks

- **Date:** 2026-09-27
- **Executor:** Claude Sonnet 5. **Grader:** Claude Opus 5.5.
- **Task:** an authored scenario has a missing step. The agent implements it
  against the live QA Dashboard
  (see [evals.json](../../.claude/skills/playwright-bdd-step-implementor/evals/evals.json)).
- **Sample:** 7 tasks, 1 run each, with the skill only.

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

Agent time is the wall-clock time from the prompt to the final report. It
includes all test runs. The checks and the skill changed after this run, and we
did not run these 7 tasks again on the current versions.

## playwright-bdd-test-healer

- **Date:** 2026-09-29
- **Executor:** Claude Sonnet 5. **Grader:** Claude Opus 5.5.
- **Task:** a scenario passed before, and a QA Dashboard change made it fail
  (see [evals.json](../../.claude/skills/playwright-bdd-test-healer/evals/evals.json)).
- **Sample:** 4 tasks, 1 run each. The run without the skill covers task 4
  only.

| Task                | Without the skill | With the skill | Agent time (with the skill) |
| ------------------- | ----------------- | -------------- | --------------------------- |
| 1 run-report        | not run           | 14 / 15        | 18.9 min                    |
| 2 defect-summary    | not run           | 12 / 15        | 6.9 min                     |
| 3 escape-rate       | not run           | 14 / 16        | 17.9 min                    |
| 4 project-pass-rate | 8 / 15            | 13 / 15        | 9.9 min                     |
| **Total**           | —                 | **53 / 61**    | median 13.9 min             |

The results show that the skill can do the work on these tasks. They are not a
measured success rate. The comparison without the skill is one data point, not
a baseline for all tasks. We added checks and changed the skill after this run,
and we did not run the evaluation again on the current versions.

## Deterministic checks

`npm run test:skills` runs the hermetic fixture, framework-contract, and
skill-contract tests on each change: 42 / 42 pass.
