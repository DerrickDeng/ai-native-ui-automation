# Revisit a finished step

Use this reference only when the user explicitly asks to inspect or change already implemented behavior at its exact runtime state.

## Scope gate

Confirm the target step, why the passing implementation is insufficient, and whether its Page Object method is shared. If completed behavior is not explicitly in scope, return to the missing/TODO entry path and leave it unchanged.

Strengthening a working locator is a valid reason to be here — scoping one that passes only by luck, or moving it onto an ancestor test id that the implementation loop did not pay a DOM query to discover. It still requires the user to ask; a locator the agent merely dislikes is not a revisit trigger.

## Establish the runtime pause

1. Grep the step text to its definition and Page Object method.
2. Before the passing baseline CLI run, pass the [generation gate](bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation), then run the focused scenario on one explicit project and record its current behavior:

   ```bash
   npx playwright test --project=<region>-<env> --grep '<scenario title>'
   ```

   If this baseline already fails, stop the completed-step revisit and route the observed failure as regression/healer work. Do not insert `REVISIT` into an already failing path.

3. Inject the framework's guarded `developmentPause` fixture from [Playwright CLI debug session](cli-debug-session.md), then put a uniquely labelled checkpoint at the first line of the target step body:

   ```ts
   await developmentPause.at('revisit-site-search');
   ```

4. After inserting the `REVISIT` checkpoint, pass the [generation gate](bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation), then start one exact `BDD_STEP_IMPLEMENTATION=1 npx playwright test --project=<region>-<env> --grep '<scenario title>' --workers=1 --debug=cli` invocation after `pgrep -fl "playwright test"` shows no leftover runner, in the background with output redirected to a log file, attach Playwright CLI to the printed session, and resume to the checkpoint so prior steps execute through the runner.

A body-only `REVISIT` checkpoint does not change bindings, but it does not exempt the next run from the generation gate. If the same definition runs repeatedly, prefer a parameter predicate; only use a module-level counter when text and arguments are identical. A fresh worker resets that counter for each run.

## Make the smallest supported change

Observe the exact checkpoint, then change the real Page Object implementation only when the observation supports it. Remove the temporary `REVISIT` checkpoint before validating; do not leave a debugging pause in runtime source.

## Focused regression check

After removing the `REVISIT` checkpoint, pass the [generation gate](bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation), then run direct CLI for final target validation with `npx playwright test --project=<region>-<env> --grep '<scenario title>'`. Before changing a shared Page Object method, discover its direct callers. Highlight the changed method and affected caller Scenarios in the handoff as not run; do not run them unless the user explicitly requests it.
