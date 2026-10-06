# bddgen and project selection

Use this reference before every new runner invocation, when generation fails, or when the target project/test must be selected.

## Generation gate before every new runner invocation

Every new runner invocation passes this gate: the first run, every reload-boundary restart, revisit baseline, revisit debug run, and focused regression run. A body-only implementation change does not change bindings, but it does not exempt the next runner invocation. Resuming an already active Playwright CLI session is not a new invocation.

For Debug, run `npx bddgen`, require exit 0, then start one exact `BDD_STEP_IMPLEMENTATION=1 npx playwright test --project=... --grep ... --workers=1 --debug=cli` invocation and attach Playwright CLI to its printed session. The inline variable applies only to this command. For final CLI validation, remove every development checkpoint, run `npx bddgen`, require exit 0, then run `npx playwright test --project=... --grep ...` without the debug option or variable.

```text
Debug: npx bddgen -> exit 0 -> exact BDD_STEP_IMPLEMENTATION=1 npx playwright test --project=... --grep ... --workers=1 --debug=cli -> attach printed session
Final: npx bddgen -> exit 0 -> npx playwright test --project=... --grep ...
```

If `bddgen` fails or exits nonzero, do not start a runner invocation. Do not reuse or trust stale generated tests or previous generated output under `tests/.features-gen/**` after failure.

- Target missing or ambiguous binding: repair it, then restart the gate.
- Unrelated out-of-scope missing or ambiguous binding: stop and report the blocker.
- `bddgen --tags` is an applicability override, not a target selector.

## Read generation output

```bash
npx bddgen
```

- Exit 0: all steps are bound.
- Exit 1 with `Missing step definitions: N`: use the printed snippets as the binding queue. Only the first 10 print; read the target feature in full for the complete queue. Do not patch the dependency's print cap.
- Exit 1 with `Multiple definitions matched scenario step`: use the reported file/line pairs to remove or tighten one overlapping pattern.

`bddgen --tags` replaces the configured applicability expression; use Playwright `--grep` to select a runtime title or tag.

## Preserve source boundaries

- `src/features/` is the authored specification. Preserve scenario titles, step text, step order, Examples, and comments.
- `tests/.features-gen/**` is generated output. Regenerate it; never edit it manually.
- Put step definitions under `src/steps/`, Page Objects under `src/pages/`, data under `src/data/`, and fixtures under `src/fixtures/`.

Step files pair with Page Objects, not feature files. Convert generated arrow callbacks to the repository's callback form and bind unfinished behavior to the guarded checkpoint described in the primary skill:

```ts
When('I open the site search', async function ({ developmentPause }) {
  await developmentPause.at('open-site-search');
});
```

## Select exactly one project

Choose one configured region/environment project, such as `hk-sit`:

```bash
npx playwright test --project=hk-sit --grep '<scenario title>'
```

Profile tags such as `@hk-sit` are applicability allowlists consumed by generation. Runtime tags such as `@smoke` are Playwright grep selectors. Do not edit a tag or profile merely to select a URL.

After a successful Debug gate, start only one test through `--grep` and one explicit project: the exact Scenario title, or one Scenario Outline row's generated title (such as `'Search the catalog for books'`). One `--debug=cli` runner can debug only one test; a second test in the same runner fails with `browser.bind: Server is already started`. Debug each other Outline row in its own runner. Final validation greps the Outline title as written in the feature (such as `'Search the catalog for <term>'`), which runs every row. Do not run every region/environment combination to discover the right one.

## Focused completion

If a shared Page Object method changed, inspect its direct callers and map only affected callers to Scenarios:

```bash
rg -n '<methodName>' src/steps src/pages
```

After the target passes, stop testing. List each changed shared method and its affected direct-caller Scenarios in the handoff, explicitly marking those Scenarios as not run. Do not run direct callers or the whole project unless the user explicitly requests it.
