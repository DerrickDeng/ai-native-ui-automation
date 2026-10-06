---
name: playwright-bdd-step-implementor
description: Use when implementing missing playwright-bdd steps, adding step definitions or Page Object methods, or explicitly revisiting completed steps. Use for one authored Scenario on one Playwright project, not broad regression healing or Gherkin redesign.
metadata:
  short-description: Implement one BDD scenario from runner-owned evidence
---

# Playwright-BDD Step Implementor

Implement one authored Gherkin Scenario through generated Playwright tests, using a focused runner as the owner of execution order and state while Playwright CLI supplies browser evidence.

## What the user sees while you work

The user follows your shell commands, not your reasoning, and consecutive commands collapse so that only their descriptions show. Give every shell command a plain `description`, from the first command to the last: setup, reading files, generation, debugging, and cleanup. If earlier commands in this session had none, start now; runs that skip the first description tend to skip them all.

- Start with the current Gherkin step, such as `Step 3/9: click "View Latest News"`. Count Gherkin lines, so the total never changes. Commands that belong to no Gherkin line start with `Setup:` or `Final check:`, so the visible count only moves forward.
- Describe the effect in the user's words. This skill names its own mechanics, and the commands you run use those names too, but the user does not know them. Translate every one, in descriptions and in the handoff:

  | Skill term                             | Say instead                                     |
  | -------------------------------------- | ----------------------------------------------- |
  | checkpoint, pause point, guarded pause | where the test stops so I can look at the page  |
  | bind a step, bindings                  | connect the step to code                        |
  | generation gate, `bddgen`              | regenerate the tests                            |
  | reload boundary, restart the runner    | start the test again                            |
  | `ctx`, producer, consumer              | the value one step saves for a later step       |
  | Page Object, fixture, locator          | the code for this page, how it finds the button |

  So write `Step 2/3: stop the test before the check`, not `bind TODO to checkpoint`.

- Post one plain line at the start (how many steps) and whenever something unexpected happens (what happened and what comes next).

## Input & Evidence Contract

### Required task inputs

- The target feature, Scenario or Scenario Outline, and explicit project (`<region>-<env>`).
- If already implemented steps should also be reviewed or changed, the user must explicitly request it. One exception: an existing step in the target Scenario that blocks it (it fails, or leaves the page in a state its own step text contradicts) is part of this work; fix it and name the change in the handoff.

### Required repository context

- `CodeRules.md`, the complete target feature, current bindings, and the relevant fixtures/configuration.
- When a requirement detail affects an implementation choice, the matching requirements Wiki and its cited Story/AC/note, retrieved through [requirement context retrieval](../requirement-context-retrieval/SKILL.md).

### Evidence sources

- Authored Gherkin states the required behavior; `CodeRules.md` and repository contracts state how the implementation must be structured.
- `bddgen` reports binding and generation results; Playwright runner logs show actual step order, checkpoints, fixture/`ctx` state, and runtime outcome.
- Playwright CLI observations show the current page. A Playwright CLI `snapshot` supplies element refs and page structure, never locator text. CLI action echoes, `generate-locator`, and the bounded test-id query supply locator evidence.
- Source code, focused test output, and bounded process/session observations answer specific implementation or runtime questions.
- A requirements Wiki helps locate cross-Story context; the cited current Story, AC, or note is the evidence for a business interpretation. The authored Gherkin still sets this Scenario's scope.

### Use the source that owns the question

| Question                                  | Source of truth                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| What behavior is required?                | Target Gherkin                                                                               |
| What does a business rule mean here?      | Matching Wiki context, checked against the cited Story, AC, or note                         |
| How must the code be structured?          | `CodeRules.md` and repository contracts                                                      |
| What is bound and what actually ran?      | `bddgen` output and Playwright runner logs                                                   |
| What is currently visible in the browser? | Playwright CLI observations                                                                  |
| Which locator may be written into source? | CLI action echo, `generate-locator`, or the bounded test-id query; DOM-derived fallback last |

Do not use one source to replace another source's state. Browser actions cannot create runner-owned fixture, `ctx`, API/setup, cleanup, `testInfo`, or server state. Snapshot text cannot establish locator provenance, and source code alone cannot prove runtime behavior.

### When evidence is missing

- If the missing evidence could change the implementation or expected result, stop the affected step and report what is missing.
- Otherwise continue the scoped work and report the item as unverified.
- Never invent content, state, selectors, or expected values.

### Requirement context lookup

Before the first runner invocation, use [requirement context retrieval](../requirement-context-retrieval/SKILL.md) when the Feature, user request, or current Step identifies a Story or raises a business question whose answer could change the implementation. Discover a single matching Wiki from task and retrieval evidence; never use an unrelated or ambiguous Wiki to fill a gap. Search again only when a later Step raises a distinct question. Check decisive Wiki conclusions against their original Story/AC/note and source freshness. If no matching Wiki exists, use the authored Feature and available repository evidence; stop the affected judgment when a missing rule matters. Wiki content never authorizes adding assertions or changing the Feature. A calculation may fail with a clear message when its divisor is zero; do not assert how an empty range is displayed unless the Scenario asks.

## Non-Negotiables

1. **BDD text is frozen.** Never change scenario titles, step text/order, Examples, or comments to ease implementation. `src/features/` is authored specification.
2. **Generated code is output.** Never manually edit `tests/.features-gen/**`; regenerate it.
3. **Steps delegate, POs assert.** Steps contain orchestration and typed scenario-state assignment, not raw `page` access or bare `expect`.
4. **The runner owns boundaries and state.** Existing steps and producers of `ctx`, fixture, `testInfo`, API/setup, or server state execute through Playwright.
5. **Select exactly one project.** Every Playwright CLI test run uses `--project=<region>-<env>`.
6. **An existing step is not a replay boundary.** Resume so the runner executes it once in the same Scenario and fixture graph.
7. **Restart only for a Node-side reload boundary.** Restart when newly saved code must execute to produce `ctx`, fixture, setup, cleanup, or other runner-owned state needed later.
8. **Generate before starting a new runner.** Before each new `npx playwright test` command, pass the matching [generation gate](references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation) and require `bddgen` to exit 0. A `resume` continues the active runner and needs no generation. If generation fails, do not start the runner or trust existing generated tests.
9. **Locators come from tool output.** Every runtime locator traces to a Playwright CLI action echo, `generate-locator`, or the bounded test-id query. A DOM-derived fallback is allowed only as the last level of the [locator order](#adaptive-evidence), with a code comment giving its reason. Never compose one from snapshot role/name text.
10. **Stop on proven impossibility.** Report a scenario/data problem when bounded independent evidence proves required content absent.
11. **Keep validation scoped.** Run only the target Scenario (or its generated Outline examples). If a shared Page Object method changed, identify that method and its affected direct-caller Scenarios for the handoff; do not run those callers or the whole project unless the user explicitly requests it.

### Runtime architecture

A class declared in `src/steps` is not a compliant Page Object. Every concrete Page Object:

- lives in `src/pages/` and extends `BasePage`;
- declares `constructor(pageContext: PageContext, private readonly profile: TestProfile)`, calls `super(pageContext)`, and navigates through established `BasePage` helpers (a page with no URL in `src/config/profiles.json` may call `this.page.goto()` with a code comment giving the reason, reported in the handoff);
- owns locators, browser actions, returned page values, and assertions;
- is registered alphabetically as a typed fixture in `src/fixtures/bddTest.ts`, constructed with the shared `pageContext` and `profile`;
- is injected into callback-style steps instead of constructed there.

When a producer returns data read from a page, its Page Object reads it and the step assigns it to typed `ctx`. A consumer narrows the optional value before passing it to a Page Object assertion. Keep active-page switching inside a Page Object using the shared `pageContext`; never store a Playwright `Page` in `ctx` or replace runner-owned state with module globals or browser-side shadow state.

Page Object fixtures keep the same instance across steps in one Scenario, but pass business values between steps through `ctx`. When a later step needs an element an earlier step used, locate it again through a shared private locator method. `ctx` holds values read from the page, never locators.

`src/data/<system>/` holds test data only: accounts, expected text, and inputs such as order ids (CodeRules D-1). Locators, URL patterns, and page structure belong to the Page Object, and a value the Scenario passes in is used directly where it arrives.

When one step text serves different widgets, branch in the step definition on its argument, such as `if (option === 'View Latest News')`, and call one single-purpose Page Object method per widget. Do not branch on `ctx` or page state: probing the page with `count()` does not wait, and a `ctx` flag makes the earlier step a producer that forces a restart.

## Gotchas

Each item below is a mistake observed in real runs of this skill. Add to this list when a new one appears.

- **Restarting after saving an implementation.** Swapping a checkpoint for real code needs no restart; each restart costs minutes and proves nothing the final run will not. Restart only for runner-owned state (Non-Negotiable 7).
- **A debug walkthrough after the last TODO.** Go straight to final validation without `--debug=cli`; it runs the same code faster.
- **Branching a shared step on `ctx` or page state.** Branch on the step's own argument instead ([Runtime architecture](#runtime-architecture)).
- **Skipping `generate-locator` for an assert-only element.** A `.count()` of 1 shows the locator is unique, not that a tool produced it.
- **Reading `outerHTML` early, then calling it level 3.** Any DOM read other than the bounded test-id query is level 4 and comes last ([locator order](#adaptive-evidence)).
- **Clicking, navigating, or reloading through `run-code`.** It hides the action echo and can change the page the runner owns; act with CLI ref commands.
- **Running `snapshot` right after an action.** The action already printed a snapshot file; grep it. Do not pipe `snapshot` through `head` or `tail`.
- **Piping the debug runner or any `playwright-cli` command, `--help` included, through `head` or `tail`.** The commands the loop needs are listed in [Playwright CLI debug session](references/cli-debug-session.md#start-and-attach), so `--help` is rarely needed; read whatever you run in full. A cut `attach` or `resume` output hides where the test stopped or why it failed, and killing a piped runner can leave it paused in the background, overwriting `reports/` later. Redirect the runner to a log file and read CLI output whole.
- **Repo-wide `npm run format`, then `git checkout` to undo it.** That can erase the user's uncommitted work; format only the files you changed.
- **No `description` from the first command on, or skill terms inside one.** Either way the user sees no progress they can follow ([what the user sees](#what-the-user-sees-while-you-work)).
- **Resuming to the consumer after saving a producer, then restarting only to validate.** The consumer was then written against a value that was never stored. Restart right after saving the producer, and write the consumer at the new pause.
- **Ending a session with `resume`, then killing the runner.** `resume` ran the Scenario on to the consumer, whose checkpoint stopped the run; the error went to the runner log, which no one read. End a session only with the [end-the-session block](references/cli-debug-session.md#end-the-session).
- **Debugging one Scenario Outline row, then writing every row's branch from it.** The runner was started with one row's title (`--grep 'Search the catalog for books'`) and never started one for the other row, so the second row never ran at a pause and its check was guessed. Debug each row in its own runner ([Scenario Outline](#scenario-outline)).
- **Chaining `resume` commands, such as `attach && resume && resume`.** The first `resume` stopped at the consumer's checkpoint; the second ran past it, the run finished, and another restart was needed. Run one `resume` per command, and read where it stopped before the next.
- **Writing a later TODO's code at an earlier checkpoint.** It then passes its own checkpoint unchecked; the page there can differ. Each TODO is written at its own checkpoint ([Save](#explore-implement-and-continue)).
- **Stopping because the blocker is an existing step.** If an earlier step in the target Scenario leaves the page wrong, fixing it is in scope ([Required task inputs](#required-task-inputs)).
- **Calling a red Scenario "the expected result" when required content is absent.** Absent content means the Scenario or its test data looks wrong; say so and name who must fix it.
- **An allowlist or a name-to-locator lookup table for values a step passes in.** Use the argument directly: it needs no `locators` entry. When the method must act differently per value, it branches on the value inside the method and throws `Unsupported <thing>` in the last branch (CodeRules P-12). When the value goes straight into the page, such as a dropdown option or text to type, pass it through: there is nothing to branch on, and a list of allowed values is the separate allowlist P-12 forbids. Locator calls stay inside methods (P-7); URL patterns are expected values, not locators, so they keep their own constant.
- **Locator details in the handoff.** Levels and sources are an internal check; the user gets the four plain parts only.

## Workflow & Routing

### Missing or TODO steps

Use the workflow below when bindings are absent or runtime source contains TODO stubs.

### Revisit a completed step

Use [revisit a finished step](references/revisit-finished-step.md) only when the user explicitly includes implemented behavior in scope. A green step whose locator needs stronger scoping belongs here; it is not part of the TODO loop.

### Core lifecycle

1. Discover the target, bind missing steps, and look up relevant requirement context when a business decision needs it.
2. Check [Additional rules for specific scenarios](#additional-rules-for-specific-scenarios) and follow every rule that applies to the target Scenario.
3. Pass the [generation gate](references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation), then start one focused `--debug=cli` runner (for a [Scenario Outline](#scenario-outline), one runner per Examples row), attach Playwright CLI, and confirm the actual checkpoint.
4. Classify the observed outcome.
5. Explore the current TODO through the [locator order](#adaptive-evidence), save its implementation before the next `resume`, and establish only its browser-visible effect through the CLI.
6. Resume the same runner through later TODO checkpoints and existing steps.
7. Restart only when a saved change must execute before the remaining Scenario can be valid.
8. Repeat steps 4–7 for each remaining TODO checkpoint; after the last TODO, resume through remaining existing steps and observe the debug runner's outcome.
9. Remove development checkpoints, pass the [generation gate](references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation), validate only the target without `--debug=cli`, and prepare the handoff with any affected direct callers highlighted as not run.

### Additional rules for specific scenarios

Before running, check which rules below apply to the target Scenario and follow all of them. Multiple rules may apply. Recheck only if the Scenario, Examples, fixture contract, or authorized scope changes.

#### Runtime state and fixtures

Read [runtime state and fixtures](references/runtime-state-and-fixtures.md) when steps share `ctx` or another runner-owned value, or API/setup/cleanup creates state. Existing producers already run in the session need no restart; a newly implemented producer requires one restart before its consumer can be finalized.

#### Scenario Outline

Inspect Examples before execution and implement parameterized bindings. One `--debug=cli` runner can debug only one test: a second test in the same runner fails with `browser.bind: Server is already started`. So debug each Examples row in its own runner, with `--grep` on that row's generated title, and look at each row on the live page before finalizing its branch. These per-row runners are not restarts. Final validation greps the Outline title as written in the feature, which runs every row. Keep each row's scenario state fresh; one observed row never proves another unless scope explicitly narrows.

### Discover and bind

Run `npx bddgen`, read its exit/output, then read the target feature and current bindings in full. Do not infer the missing queue from printed snippets alone. Follow [Playwright CLI debug session](references/cli-debug-session.md) and bind each missing step with a unique guarded checkpoint:

```ts
When('I open the site search', async function ({ developmentPause }) {
  await developmentPause.at('open-site-search');
});
```

Step files pair with Page Objects, not feature files. The framework's `developmentPause` fixture owns only guarded `page.pause()`; business browser behavior remains in Page Objects. Add a uniquely labelled checkpoint only while implementing the unfinished step, then remove that checkpoint before final validation. After binding, pass the [generation gate](references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation) before starting a runner.

### Confirm the checkpoint and choose continue or restart

At each checkpoint: match the runner's current BDD step and checkpoint label; classify the outcome; determine whether remaining work needs newly saved Node-side code or only browser-visible state; continue unless evidence proves a reload or safety boundary.

| Next work                                  | Action                                             |
| ------------------------------------------ | -------------------------------------------------- |
| Browser-observable TODO                    | Explore, save, establish its page effect, resume   |
| Existing step                              | Resume; its loaded implementation runs once        |
| TODO consuming state from an existing step | Resume with the same runner-owned state            |
| Saved TODO must produce Node-side state    | End, regenerate, restart, and execute the producer |
| Non-repeatable external side effect        | Stop and coordinate with the user                  |

A later existing step is not a replay boundary; resume so the runner executes it in the same Scenario. A saved TODO that must populate runner-owned state is a Node-side reload boundary. Do not finalize its consumer until a restarted runner executes the producer and reaches the consumer checkpoint.

### Explore, implement, and continue

Keep describing every command as [the user sees it](#what-the-user-sees-while-you-work). For each TODO, explore only the evidence it needs, then:

- **Explore.** Get each locator through the [locator order](#adaptive-evidence), starting at level 1, and record the raw tool output for the final self-check. After a CLI action, grep the snapshot file it printed ([details](references/cli-debug-session.md#start-and-attach)); run `snapshot` only when the page changed without printing one. A `resume` that passes only checkpoints does not change the page, so keep using the last snapshot file.
- **Save.** Write this TODO's Page Object/step implementation before the next `resume`, using the locators as recorded. Write only this TODO: a later TODO's elements may not exist yet, or may change, until the runner reaches its own checkpoint. When it does, check the current page for that TODO's elements first, then write its code. Do not batch implementations after exploration: code written later from memory was never checked against the page.
- **Continue.** The active worker does not hot-load the edit, so use the CLI action already performed during exploration to establish browser state, then `resume`. Existing steps execute through the runner; later TODOs pause at their checkpoints. Do not manually execute an existing step. Replacing a checkpoint with its implementation is never a restart reason: the new code first runs in final validation. After the last TODO, go straight to final validation; do not start another debug run to walk through the Scenario. One exception to resuming: if the TODO you just saved stores a value that a later step reads, do not resume; [end the session](references/cli-debug-session.md#end-the-session) now and restart as below.

When a Node-side reload boundary is proven, restart in this order: [end the current debug session](references/cli-debug-session.md#end-the-session) -> pass the [generation gate](references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation) -> start one new focused `--debug=cli` runner -> runner executes the saved producer from the beginning -> confirm/classify the consumer checkpoint. A new checkpoint returns to checkpoint confirmation. Before restarting, pass the stored value to the consumer's checkpoint, such as `developmentPause.at('check-url', { rememberedUrl: ctx.rememberedUrl })`. If the value was never stored, the checkpoint stops the run and says to restart; if it was, the runner log prints it. Write the consumer only after that pause shows a real value ([details](references/runtime-state-and-fixtures.md#runtime-state-reload-boundary)).

Retry budget: 6 attempts per step. State a concrete locator or behavior hypothesis before each rewrite.

### Adaptive evidence

Keep the first snapshot. Query only a remaining evidence gap.

Take each locator from the first level below that yields a unique match. Move down only when the level above has failed; never skip a level.

1. **Generated.** For acted-on elements, act by CLI ref and record its generated Playwright code. For assert-only elements, run `generate-locator` on the ref. An element first found through `eval`, `run-code`, or snapshot text still starts here.
2. **Generated and chained.** If level 1 is not unique, run `generate-locator` on an enclosing container's ref and chain the two with `filter()` or a child locator.
3. **Test-id query.** Escalate only when a recorded locator actually fails. Then run this bounded read-only test-id query once for that state. Only this exact query counts as level 3; any other DOM read, such as `outerHTML`, is level 4 even when it reveals a test id:

   ```js
   () =>
     Array.from(document.querySelectorAll('[data-testid]'))
       .slice(0, 80)
       .map((el) => ({ testid: el.getAttribute('data-testid'), text: (el.textContent || '').trim().slice(0, 80) }));
   ```

4. **DOM-derived fallback.** Only when levels 1–3 give no unique locator (for example, the element has no snapshot ref, or no accessible name tells it apart), read its DOM such as `outerHTML` and write a CSS or XPath fallback (CodeRules P-6). Confirm it with `.count()` and add a code comment saying why levels 1–3 failed.

A generated result you discard counts as not run. A `.count()` of 1 proves uniqueness, not provenance. Normalize each locator candidate against `CodeRules.md`: scope it and remove `.first()`, without delaying the TODO loop merely to seek a stronger green locator.

Never use DOM evaluation to click, fill, dispatch events, or replace Playwright actionability. Use CLI `run-code` only for a non-destructive `.count()`/`.isVisible()` check or a level-4 DOM read; it never clicks, fills, navigates, or reloads. Act only through CLI ref commands such as `click e90`. Take a screenshot only after repeated locator failures or unresolved visual ambiguity.

### Runtime outcome routing

| Observed outcome                 | Route                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| Expected TODO checkpoint         | Explore and implement the current TODO                       |
| Next TODO after resume           | Confirm the checkpoint, then continue the core lifecycle     |
| Earlier/wrong checkpoint         | Diagnose the actual blocker before the intended TODO         |
| Page contradicts an earlier step | Fix that earlier step before the intended TODO               |
| Hang or infrastructure failure   | Collect bounded process/session evidence and recover or stop |
| Required content not observable  | Gather independent evidence, then stop rather than fabricate |

For exceptional outcomes, follow [debug evidence and recovery](references/debug-evidence-and-recovery.md). Successful recovery returns to checkpoint confirmation.

## Output Contract & Quality Gates

Write the handoff for a reader who does not know this skill, in plain words, with four parts: what was implemented (Scenario name and step count); the test result with the one command that reruns it; the files changed; and what needs the user's attention (unverified items, affected callers not run, any exception to `CodeRules.md` such as a direct `page.goto()`, or why work stopped), or that nothing does. When work stopped because required content is absent, say plainly that the Scenario or its test data looks wrong and that its owner must fix it. Leave out internal terms such as checkpoints, `M/N`, locator levels, and reload boundaries, and do not narrate individual tool calls. Do not call a step validated at its checkpoint; exploration never executes the new code, only the final run does.

When requirement context affected a judgment, name the Story or note that supported it within these four parts. Put unresolved or stale evidence under what needs attention; do not add a fifth handoff section. When the page shows text or behavior that the requirement contradicts (for example helper text that disagrees with the Story), say so under what needs attention and ask the owner to confirm it; do not change the Feature or add a check for it. When the requirement says a Scenario's claim is not guaranteed or is still undecided, report a red result as a question for the Scenario's owner, not as a defect in the application, and do not weaken the check to make it pass.

In "Files changed", give each path one plain line about what it does for the user, not class or method names. For example, for a Scenario that stopped because required content is absent:

```markdown
**What was done:** "Pay with a saved card" (5 steps). I wrote step 4, which checks that the order summary shows the card's last four digits.

**Result:** It fails. The order summary shows no card digits at all; I checked the live page twice. The Scenario or its test data looks wrong, and its owner needs to fix it. Rerun with `npm test -- --project=sg-uat --grep "Pay with a saved card"`.

**Files changed:** src/pages/shop/OrderSummaryPage.ts (new): reads the order summary. src/steps/shop/checkout.steps.ts: step 4 now uses it.

**Needs your attention:** Decide whether the summary should show the card digits or the Scenario should check something else.
```

- [ ] Every application run used one explicit project.
- [ ] The focused Scenario passed with `--grep`; all generated Outline examples passed unless scope narrowed; changed shared Page Object methods and affected direct-caller Scenarios were identified for handoff without running them.
- [ ] No TODO/REVISIT/development checkpoint remains in changed runtime source.
- [ ] Every changed locator traces to a Playwright CLI action echo, `generate-locator`, or the bounded test-id query, or is a level-4 fallback with a code comment giving its reason.
- [ ] `git diff -- src/features/` is empty for this work, and no generated file was manually edited.
- [ ] `npm run lint` passed.
- [ ] Every development checkpoint was removed and final validation used the normal `playwright.config.ts` without `--debug=cli`.
- [ ] The handoff has the four parts above in plain words.
- [ ] Anything you saw on the page that the requirement context contradicts (for example helper text that disagrees with the Story) is named under what needs attention, even when the Scenario passes, with what the page says, what the Story says, and that the owner should confirm.

Stop testing after the target passes. In the handoff, highlight each changed shared Page Object method and its affected direct-caller Scenarios, marking those Scenarios as not run. Do not run the direct callers or the entire selected project unless the user asks.

## Boundaries & Stop Conditions

- Stop the affected behavior when two independent observations prove required content absent; do not fabricate an implementation.
- Stop after 6 unsuccessful attempts for one step and report the last supported hypothesis and evidence.
- Stop before replaying a genuinely non-repeatable side effect such as an order or payment and coordinate with the user.
- If `bddgen` fails, do not start the planned runner; existing generated tests may be stale.
- Route residual unrelated regression failures to `playwright-bdd-test-healer`; do not broaden this skill into a project sweep.
- Preserve authored Gherkin, generated-output boundaries, the selected project, and user-authorized revisit scope even when recovery would be easier by changing them.
- Format only the files this work changed (`npx prettier --write <files>`). Never run repo-wide `npm run format`, and never run `git checkout`, `git restore`, or `git stash` on files outside this work; they can destroy the user's uncommitted changes.

## References

- Read [bddgen and project selection](references/bddgen-and-project-selection.md) for every new runner invocation, generation failure, project choice, and focused command form.
- Read [Playwright CLI debug session](references/cli-debug-session.md) when installing, attaching to, resuming, or removing guarded development checkpoints.
- Read [runtime state and fixtures](references/runtime-state-and-fixtures.md) when a step produces or consumes runner-owned state.
- Read [debug evidence and recovery](references/debug-evidence-and-recovery.md) only for a wrong checkpoint, hang, infrastructure failure, or unobservable required content.
- Read [revisit a finished step](references/revisit-finished-step.md) only for user-authorized changes to already implemented behavior.
- Use [requirement context retrieval](../requirement-context-retrieval/SKILL.md) only when a business question needs cross-Story context or source confirmation.
