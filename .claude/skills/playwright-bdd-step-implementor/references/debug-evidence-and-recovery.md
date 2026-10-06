# Debug evidence and recovery

Use this reference after runtime observation reveals a wrong checkpoint, hang, infrastructure failure, or unprovable requested result.

## Classify the exceptional outcome

After the core workflow routes an unexpected runtime result here, compare the runner's current BDD step, checkpoint label, and error with the intended TODO before interpreting page state.

| Observation                                                             | Action                                                                                              |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Earlier implemented step with timeout/network error                     | Replay once if plausibly transient; if repeatable, fix that real blocker first.                     |
| Earlier implemented step passed, but the page contradicts its step text | It is the real blocker: fix that step first, then restart as below. Name the change in the handoff. |
| Page cannot contain the specified content                               | Gather bounded independent evidence, report a scenario/data issue, and stop.                        |
| Browser/CLI launch, attachment, or session failure                      | Mark the run invalid; diagnose infrastructure rather than changing the skill or scenario.           |

Never implement the original target from evidence gathered at an earlier or otherwise wrong checkpoint. The page is not yet in the target step's runtime state.

## Evidence escalation

When required content remains unobservable after the core's normal evidence sequence, add independent evidence only for the unresolved gap. Before declaring the content impossible, require at least two appropriate evidence forms, such as the existing accessibility snapshot plus a bounded targeted DOM/text search. Add a screenshot only when visual ambiguity remains.

## Retry discipline

Cap locator rewrites at six attempts per step. State a concrete hypothesis before each rewrite. Bound every retry explicitly. Stop earlier when evidence proves a scenario/data issue; do not exhaust the budget on alternate selectors for absent content.

When a recorded locator fails as ambiguous or not found, move down the core's [locator order](../SKILL.md#adaptive-evidence) one level at a time: chain from an enclosing container's generated locator, then the bounded test-id query, then a DOM-derived fallback with a code comment giving its reason. Do not spend attempts rewriting selectors by guesswork.

## CLI debug session stalls or closes

Suspect an unbounded application/test wait before assuming CLI attachment is broken. Keep retries such as `expect(...).toPass()` explicitly bounded so the runner can reach a checkpoint or report a failure.

- Bound every retry and wait explicitly.
- If aborting leaves a browser worker behind, terminate only the focused runner/attachment created for this task.
- If Playwright CLI cannot snapshot, confirm that it attached to the printed `tw-...` session and that the original runner is still paused.
- If a CLI command reports `Session closed`, inspect the original Playwright runner's exit status; attachment closure alone proves neither pass nor failure.

Repeated Chrome `SIGABRT`, `EPERM`, or launch failures in a sandbox are infrastructure evidence. Re-run in an environment allowed to launch the configured browser before grading application behavior.

## Resume and stop conditions

| Result                         | Next action                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected TODO checkpoint       | Return to the primary checkpoint workflow                                                                                                                                                                                                                                                                                     |
| Earlier real blocker repaired  | Pass the [generation gate](bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation), then start one new focused `--debug=cli` runner after `pgrep -fl "playwright test"` shows no leftover runner, in the background with output redirected to a log file, and confirm the actual checkpoint again |
| Infrastructure restored        | Invoke the [generation gate](bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation) before a fresh focused `--debug=cli` runner started after `pgrep -fl "playwright test"` shows no leftover runner, in the background with output redirected to a log file                                     |
| Required content proven absent | Stop and report the scenario/data blocker                                                                                                                                                                                                                                                                                     |
| No safe bounded recovery       | Stop with collected evidence; do not guess                                                                                                                                                                                                                                                                                    |
