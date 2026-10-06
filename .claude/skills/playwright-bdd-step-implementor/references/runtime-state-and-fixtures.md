# Runtime state and fixtures

Use this reference when steps share runner-owned values or setup/cleanup creates scenario state.

## Active page reference

`bddTest.ts` creates one test-scoped `PageContext` from Playwright's `page`
when requested. Page Object fixtures in the same Scenario receive that same
instance, and `BasePage.page` reads `pageContext.current` on every access.
Changing `current` in a Page Object makes other existing Page Objects read the
new page; their constructors do not rerun. Do not assign `current` in a Step or
store a Playwright `Page` in `ctx`. The framework has no popup capture or tab
switching method yet. `AfterStep` screenshots and `developmentPause` read the
current page.

## Values shared through `ctx`

Do not rely on an implicit World-style state object. Declare each stored value explicitly in the scenario-scoped `ctx` fixture type in `src/fixtures/bddTest.ts`:

```ts
type ScenarioContext = {
  rememberedUrl?: string;
};
```

The producer reads through a Page Object and stores through the step:

```ts
ctx.rememberedUrl = await reportPage.runLinkUrl(runName);
```

The consumer narrows the optional value, then delegates its assertion:

```ts
if (typeof ctx.rememberedUrl !== 'string') {
  throw new Error('No URL was remembered by the producer step');
}
await reportPage.assertCurrentUrl(ctx.rememberedUrl);
```

## Runtime-state reload boundary

Existing producers already loaded in the active worker can run normally; resume through them and keep their `ctx`, fixture, API, `testInfo`, or server state in the same Scenario. A restart is required only when a newly saved TODO implementation must produce Node-side state for later work.

At the producer checkpoint:

1. observe and implement the producer;
2. add the typed context/fixture field it writes;
3. do **not** imitate the assignment in browser JavaScript or finalize the consumer from page state alone;
4. pass the stored value to the consumer's checkpoint, such as `developmentPause.at('check-url', { rememberedUrl: ctx.rememberedUrl })`;
5. [end the active session](cli-debug-session.md#end-the-session), pass the generation gate, and restart the focused Scenario, right away and without resuming to the consumer first;
6. let the runner execute the saved producer and own the resulting state;
7. at the consumer checkpoint, read the runner log line `TODO_CHECKPOINT check-url rememberedUrl="<value>"`, then implement the consumer and remove the checkpoint. If the value was never stored, the checkpoint stops the run instead and says to restart: the saved producer has not run yet.

Resuming to the consumer in the first session shows the page but not the value: the saved producer never ran there, so the stored value is still empty. Treating the final validation run as the restart skips the check entirely.

Paused browser actions mutate the page, not the runner's fixture graph. Textual adjacency never overrides this reload boundary. If an already implemented producer ran earlier in the current session, its value is already valid and no restart is needed.

## API setup and cleanup

Prefer a lazy typed fixture. Code before `use()` is setup; code after it is teardown:

```ts
seededAccount: async ({ request }, use) => {
  const account = await createViaApi(request);
  await use(account);
  await deleteViaApi(request, account);
},
```

Reserve tagged `Before`/`After` hooks only for legacy hook-shaped code whose structure must remain. If newly saved setup code must create state that the active worker cannot load, restart through the fixture. If the loaded setup already ran, keep the current session.

## Scenario isolation

Keep state in the established scenario-scoped fixture. Do not replace it with module globals, browser-side shadow state, or a duplicate fixture. Each scenario and each Scenario Outline example receives fresh state.
