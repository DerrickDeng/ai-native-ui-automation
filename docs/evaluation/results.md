# Evaluation Results

These are the results of the agent evaluations in the
[methodology](methodology.md). Each task ran once in each configuration, so we
show passed checks, not success rates.

## Summary

| Skill                           | Without the skill | With the skill | Sample          | Date       |
| ------------------------------- | ----------------- | -------------- | --------------- | ---------- |
| playwright-bdd-step-implementor | 91 / 157          | **150 / 157**  | 9 tasks × 1 run | 2026-10-14 |
| playwright-bdd-test-healer      | 36 / 69           | **55 / 69**    | 4 tasks × 1 run | 2026-10-14 |

## Setup

- **Executor:** Claude Sonnet 5.5, effort `medium`, run by headless Claude Code
  in auto permission mode. Five runs with the skill used `bypassPermissions` mode (see
  [Limits of this run](#limits-of-this-run)).
- **Grader:** Claude Opus 5.5, with the checks in each skill's `evals.json`.
- **App under test:** the live QA Dashboard at commit `098ed88`, with demo data
  loaded on the same day.
- **Configurations:** both use the same task, the same repository, and the same
  `CLAUDE.md` and `CodeRules.md`. Without the skill, the agent is told not to
  use the Skill tool, and the task text does not name the skill.
- **Isolation:** each run starts in a new git worktree. The agent cannot read
  the checks, the earlier runs, or the app source. A scan of all 26
  transcripts found no reads of these files.
- **Agent time:** the wall-clock time from the prompt to the final report,
  including all test runs.

## playwright-bdd-step-implementor: with and without the skill

In each task, an authored scenario has a missing or weak step, and the agent
implements it against the live QA Dashboard
(see [evals.json](../../.claude/skills/playwright-bdd-step-implementor/evals/evals.json)).

| Task                 | Without the skill | With the skill |
| -------------------- | ----------------- | -------------- |
| 1 defect-tiles       | 9 / 16            | **16 / 16**    |
| 2 defect-escape-rate | 13 / 17           | **17 / 17**    |
| 3 filter-narrowing   | 9 / 15            | **14 / 15**    |
| 4 section-tour       | 12 / 20           | **19 / 20**    |
| 5 run-report-build   | 13 / 18           | **18 / 18**    |
| 6 run-filters        | 9 / 16            | **15 / 16**    |
| 7 tile-counts        | 11 / 19           | **19 / 19**    |
| 8 pass-rate-check    | 7 / 19            | **16 / 19**    |
| 9 failing-not-flaky  | 8 / 17            | **16 / 17**    |
| **Total**            | **91 / 157**      | **150 / 157**  |
| Agent time, median   | 3.4 min           | 2.1 min        |

How to read this:

- The skill scores higher on all 9 tasks, and it is faster.
- Without the skill, the agent never started a debug session. It found
  locators by printing the page HTML in a normal test run, not from live page
  evidence.
- Without the skill, the agent did not look up business rules in the
  requirement wiki (tasks 8 and 9). With the skill, the agent loaded the
  retrieval skill on its own, although the task did not name it.
- Without the skill, the agent decrypted, or tried to decrypt, the test
  account password outside the test code in 3 tasks. With the skill, it did
  not.
- The skill runs here are from skill commit `776394d`. That commit added two
  gotchas after the first round: keep a check red when the requirement is
  undecided, and keep temporary files in the session scratchpad. In the first
  round, task 9 scored 12 / 17, because the agent loosened the check and
  reported a pass. With the gotchas, it kept the check red and asked the
  scenario owner, and scored 16 / 17.
- Remaining weak points: in task 8 the agent read the retrieval skill late and
  added a check that the scenario does not ask for. In tasks 3 and 9 it still
  wrote one temporary file outside the session scratchpad.

## playwright-bdd-test-healer: with and without the skill

In each task, a scenario passed before, and a QA Dashboard change made it fail
(see [evals.json](../../.claude/skills/playwright-bdd-test-healer/evals/evals.json)).

| Task                | Without the skill | With the skill |
| ------------------- | ----------------- | -------------- |
| 1 run-report        | 10 / 17           | **14 / 17**    |
| 2 defect-summary    | 9 / 17            | **13 / 17**    |
| 3 escape-rate       | 10 / 18           | **14 / 18**    |
| 4 project-pass-rate | 7 / 17            | **14 / 17**    |
| **Total**           | **36 / 69**       | **55 / 69**    |
| Agent time, median  | 2.0 min           | 1.2 min        |

How to read this:

- The skill scores higher on all 4 tasks, and it is faster.
- Both configurations found the right cause in most tasks. The difference is
  in how the agent works: without the skill, it read the live app with `curl`
  or its own scripts, and it decrypted the test password outside the test code
  in 2 tasks.
- With the skill, the agent reported a specification error in task 2 and
  changed no code. Without the skill, it blamed the release and gave three
  possible causes.
- Weak points of the skill: the agent often skipped the trace snapshot of the
  failed action, and its reports did not name a category (fixed, flaky, or
  specification or data error).

## Limits of this run

- **Permission mode.** The fixture steps file keeps an encrypted test
  password. When the agent moved that code into a Page Object, the auto mode
  classifier saw a credential copy and blocked the command. The skills ask for
  that move, so five runs with the skill ran in `bypassPermissions` mode
  instead: step-implementor section-tour and run-report-build, and test-healer
  run-report, escape-rate, and project-pass-rate.

  Two runs without the skill also had one blocked command each. In
  step-implementor tile-counts, the block stopped an attempt to decrypt the
  test password. In test-healer defect-summary, the agent decrypted the
  password with another command after the block. We kept these runs as they
  are.

- **Temporary files.** Most runs in both configurations wrote logs to `/tmp`
  or `$TMPDIR` instead of the session scratchpad, so they failed that check.
- **One run for each task.** The results show a consistent difference, not a
  measured success rate.

These results replace the earlier rounds from 2026-09-27 to 2026-10-01, which
used older skill versions, other models, and only part of the tasks.

## Deterministic checks

`npm run test:skills` runs the hermetic fixture, framework-contract, and
skill-contract tests on each change: 42 / 42 pass.
