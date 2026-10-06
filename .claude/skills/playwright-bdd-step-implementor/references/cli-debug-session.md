# Playwright CLI debug session

Use this reference for the primary TODO loop. The goal is one runner-owned Scenario session that can pause at each unfinished step, let the CLI establish browser-visible state, and continue through existing steps without replaying setup.

## Framework checkpoint support

The framework registers `developmentPause` in `src/fixtures/bddTest.ts`; `src/fixtures/developmentPause.ts` owns the guard and pauses the current `pageContext` page. An inline `BDD_STEP_IMPLEMENTATION=1` on the focused debug command enables the pause without another Playwright config:

```ts
type DevelopmentPause = {
  at(label: string, needs?: Record<string, unknown>): Promise<void>;
};

// Without BDD_STEP_IMPLEMENTATION=1, at(label) throws
// "TODO remains: <label>". With it, at(label) pauses.
// `needs` names values an earlier step stores; an undefined value stops the
// run with a message to restart, and stored values are printed at the pause.
```

While an unfinished step is being implemented, inject the existing fixture and add one unique checkpoint:

```ts
When('I open the site search', async function ({ developmentPause }) {
  await developmentPause.at('open-site-search');
});
```

The guard prevents an unfinished checkpoint from passing in normal execution. Keep the checkpoint in the loaded worker while exploring; write the real implementation to source, then remove every checkpoint binding before final validation. Keep the framework fixture.

## Start and attach

Pass the generation gate, then start one exact Scenario, or one Scenario Outline row by its generated title, with the inline debug variable (one debug runner can debug only one test):

```bash
npx bddgen
pgrep -fl "playwright test"   # must print nothing; stop any leftover runner first
BDD_STEP_IMPLEMENTATION=1 npx playwright test \
  --project=<region>-<env> \
  --grep '<exact scenario title or unique tag>' \
  --workers=1 \
  --debug=cli > <scratchpad>/bdd-debug.log 2>&1 &
```

Run it in the background with output redirected to a log file, then read the log. Do not pipe the runner through `tail` or `head`: the pipe hides the session name, and killing the pipe job can leave the runner paused in the background, holding a browser and later overwriting `reports/`.

The runner first pauses at Scenario start and prints a session such as `tw-abcdef`. Attach a stable CLI session name, then resume to the first TODO checkpoint:

```bash
playwright-cli -s=bdd-step attach tw-abcdef
playwright-cli -s=bdd-step resume
```

Run every command against `-s=bdd-step`. Read the page with `snapshot`, `generate-locator`, and a read-only `run-code`, and move the run with `step-over` and `resume`. Act on the page with ref commands. The common ones are `click`, `fill`, `select`, `check`, `hover`, and `press`; Playwright CLI's own [skill](../../playwright-cli/SKILL.md) lists them all, including `dblclick`, `type`, `drag`, `upload`, and dialog handling. Each ref command prints the Playwright code it ran, which is locator evidence; `run-code` prints none, so never click, fill, or navigate through it. Do not use `pause-at` to reach a TODO: it stops only on a line that makes a browser call, such as a click or an `expect`, and an unfinished step has none. A step definition's first line or the generated spec's `await When(...)` never stops; the run continues past it. The explicit `page.pause()` checkpoint is the control point.

With those and the linked skill, you should not need `--help`. Command forms that differ from what you might guess (there is no `find` command):

```bash
playwright-cli -s=bdd-step click e90              # bare ref, no "ref=" prefix
playwright-cli -s=bdd-step generate-locator e90
playwright-cli -s=bdd-step run-code "async (page) => page.getByTestId('x').count()"   # must be a function of page
```

Each action prints its snapshot as a file path, `[Snapshot](.playwright-cli/page-*.yml)`. The path is relative to the directory you ran `playwright-cli` from, normally your working directory; never search the disk for it. A file can be empty right after a pause, before the page has rendered; then run `snapshot` and read its output instead. While the page has not changed since that action, grep that file instead of running `snapshot` again. A `resume` that passes only checkpoints does not change the page, so the last file stays current. When you do run `snapshot`, save the whole output to a file and grep it; a `head`- or `tail`-truncated view forces a second snapshot of the same page.

## End the session

To end a debug session, for a restart, run this block as written:

```bash
pkill -f "playwright test"
sleep 2; pgrep -fl "playwright test"              # must print nothing; the runner takes a moment to exit
grep -n "not stored yet" <scratchpad>/bdd-debug.log   # must print nothing
```

- `pkill` is the only way to end the runner. `playwright-cli close`, `detach`, and `kill-all` leave it paused in the background.
- Never end a session with `resume`. It runs the rest of the Scenario, including existing steps and later checkpoints.
- If `grep` prints a line, the run went past a producer to its consumer before the producer's new code ran. Restart before writing that consumer.

## Continue versus restart

The active worker does not hot-load saved TypeScript edits. CLI actions can establish browser-visible state for the current TODO, after which `resume` returns from its checkpoint.

- Resume through later existing steps. They execute their already-loaded implementation in the same runner, fixture graph, browser context, and `ctx`.
- Resume to later TODO checkpoints when their required evidence is browser-visible. Explore and save each implementation without starting a new runner.
- Restart when a saved change must execute in Node before the remaining Scenario can be valid. Examples include a TODO producer that must write `ctx`, a new or changed fixture/setup path, or a repaired existing step/Page Object method needed later in the same run.
- Replacing a checkpoint with its implementation is not a restart reason. The new code first runs in final validation.
- After the last TODO, go straight to final validation. Do not start another debug run to walk through the Scenario.
- A non-repeatable external side effect is a stop condition; do not replay it without user coordination.

For a restart, [end the session](#end-the-session), pass the generation gate again, and start a new exact Scenario invocation. Resume within one active session is not a new runner invocation and does not require another `bddgen`.

Do not count an exploration run as validation. Its loaded TODO checkpoint bodies did not execute the newly saved implementations. Final validation must remove every development checkpoint, use the normal `playwright.config.ts`, omit `--debug=cli`, pass the normal generation gate, and run the focused Scenario normally.

At Scenario completion, a CLI command may report `Session closed`. Read the original Playwright runner's exit status and report; the attachment's closure alone is not a pass or failure.
