# Playwright Coding Rules

## Purpose and How to Cite

This document is the review contract for this playwright-bdd framework.
Every rule has an ID (`G-1`, `P-2`, …). Cite IDs in code review comments.

- Installation, configuration, and run instructions live in [README.md](./README.md).
- If a rule here disagrees with `playwright.config.ts`, `src/config/framework/`, or
  `eslint.config.mjs`, the executable configuration wins. Fix this document.
- Rules marked **(lint)** are the ones `npm run lint` can catch on its own.
  Nothing runs it for you — the Jenkins pipeline runs `npm test` only (R-9) —
  so run it yourself before asking for review.
- T-3, R-1, and D-7 fail on every run. They live in config load or
  `globalSetup`, so no one can skip them.
- Every other rule is enforced by review. No pipeline stage blocks
  non-compliant code, which makes review the real gate.
- The reference implementation is the `todoMvc` system
  (`src/pages/todoMvc/`, `src/steps/todoMvc/`, `src/data/todoMvc/`) plus the
  framework code in `src/config/framework/`. When in doubt, copy their shape.

## G — General and Boundaries

- **G-1** Feature files describe business behavior. They contain no selectors,
  waits, or implementation details.
- **G-2** Step definitions translate Gherkin into Page Object calls. They hold
  no browser logic.
- **G-3** Page Objects own page-specific locators, interactions, and assertions.
- **G-4** Test data and profile configuration stay outside Page Objects. Pages
  receive them through helpers and `profile`.
- **G-5** Files under `tests/.features-gen/` are generated. Never edit them;
  regenerate with `npm run bddgen`. (A second generated tree exists at
  `src/config/framework/__tests__/profile-tags/.features-gen/`; same rule.)
- **G-6** Use the same system directory name across all four layers so a flow
  is easy to trace:

```text
src/features/todoMvc/ -> src/steps/todoMvc/ -> src/pages/todoMvc/ -> src/data/todoMvc/
```

- **G-7** Use relative import paths only. The project defines no path aliases.
- **G-8** Import types with `import type { X }` or `import { type X }` when the
  import is type-only.
- **G-9** All committed TypeScript passes `npm run lint` (tsc + eslint) and is
  formatted by Prettier (`npm run format`). No exceptions for test code.
- **G-10** No `console.log` in runtime code. The single sanctioned `console.warn`
  is the screenshot-failure warning in the `AfterStep` hook (see X-7).

## N — Naming

- **N-1** Use names that describe the business area or the user-visible
  outcome. Avoid vague names such as `common`, `helper`, `util`, `data`,
  `test1`, or `page2` unless the file is the intentional shared base of that
  kind (e.g. `dataHelper.ts`, `BasePage.ts`).

| Item                                        | Convention                                                                               | Examples                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| System directory                            | `camelCase`; identical in `features`, `steps`, `pages`, and `data`                       | `todoMvc`, `trading`                         |
| Feature file                                | `camelCase.feature`, business-oriented name                                              | `todoList.feature`                           |
| Page Object file/class                      | `PascalCase`; suffix a full page with `Page`                                             | `TodoPage.ts`; component: `TodoFooter.ts`    |
| Step file                                   | `camelCase.steps.ts`, named after its Page Object                                        | `todoPage.steps.ts`                          |
| Type, interface, class                      | `PascalCase`, singular noun or noun phrase                                               | `TestProfile`, `ScenarioContext`, `TodoPage` |
| Function, method, parameter, local, fixture | `camelCase`, starting with a verb or meaningful noun                                     | `addTodo`, `todoCode`, `todoPage`            |
| Boolean                                     | `camelCase` starting with `is`, `has`, `can`, `should`, or `needs`                       | `isVisible`, `hasError`, `shouldRetry`       |
| Test data key                               | Preserve the system's external contract; otherwise `camelCase`                           | `releaseReport`, `oneItemLeft`               |
| Constant mapping                            | `UPPER_SNAKE_CASE` only for a module-level domain mapping; locator keys stay `camelCase` | `STATUS_LABELS`, `locators.newTodoInput`     |

- **N-2** Keep established product acronyms in their recognized form. Do not
  invent new unexplained abbreviations.
- **N-3** A Page Object class, its file, its fixture, and its step file share
  one stem: `TodoPage` / `TodoPage.ts` / `todoPage` /
  `todoPage.steps.ts`.
- **N-4** The fixture name is the class name with the leading acronym
  lowercased as a block: `TodoPage → todoPage`, `URLPage → urlPage`.
- **N-5** One step file per Page Object, not per feature file.
- **N-6** A reusable page fragment (a shared header, a menu) is still a Page
  Object; it may omit the `Page` suffix.
- **N-7** Name Page Object methods by user action or observable state:
  `openProducts()`, `searchProducts()`, `assertLoaded()` — not `clickMenu()` or
  `checkElement()`.
- **N-8** Gherkin step text uses business language only. No CSS, XPath, test
  IDs, or method names in step text.

## F — Feature Writing

- **F-1** One step expresses one business intent. Two business intents that
  can succeed or fail independently belong in separate steps.
- **F-2** Atomicity follows business intent, not clicks. One business step may
  need several automation operations inside the Page Object.
- **F-3** `Given` = initial business state, `When` = meaningful user action,
  `Then` = observable system outcome.
- **F-4** Meaningful UI interactions (`selects "Approve"`) are fine. Fragile
  details (colors, screen positions, DOM structure, element types) are not.
- **F-5** Expected results are specific and verifiable. Ban vague words:
  `correctly`, `successfully`, `properly`, `as expected`.
- **F-6** Test data carries business meaning. Prefer `"<orderNumber>" as the
order awaiting approval` over `"<value>"`.
- **F-7** No selectors, Playwright methods, fixed waits, or Page Object names
  inside feature files.
- **F-8** A committed feature file is a frozen specification. Changing its
  wording, order, titles, tags, or Examples data to make automation pass is a
  spec change and needs explicit authorization.
- **F-9** Scenarios are independent. No scenario relies on state left by
  another scenario.

Good example:

```gherkin
Scenario: Approving a pending order clears it from the approval queue
  Given the operator is signed in
  And order "SO-10042" is pending approval
  When the operator approves order "SO-10042"
  Then the status of order "SO-10042" is "Approved"
  And order "SO-10042" is absent from the pending approval queue
```

Bad example:

```gherkin
# F-5: "works" is not a verifiable outcome
Scenario: Order approval works
  # F-3: Given walks the UI instead of stating a business state
  Given the operator opens the login page
  And the operator enters the username and password and clicks Sign in
  # F-1: creating an order and submitting it are two business intents
  And the operator creates order "SO-10042" and submits it for approval
  # F-7: a selector belongs in the Page Object, not the specification
  When the operator clicks the #approve-btn button
  # F-5: "successfully" hides what is actually checked
  Then the order is approved successfully
```

## T — Tags and Applicability

- **T-1** A project (`--project=<region>-<environment>`) defines both where to
  run and which scenarios apply. Valid combinations derive from
  `REGIONS × ENVIRONMENTS` in `src/config/framework/profile.ts` (today:
  hk, sg, tw × sit, uat). Do not hardcode the list anywhere else.
- **T-2** Applicability tags are exact, lowercase profile names: `@hk-sit`,
  `@sg-uat`, …. Multiple profile tags form an allowlist. A scenario without a
  profile tag applies to every profile.
- **T-3** Dimension tags (`@hk`, `@sit`) and uppercase variants (`@HK-SIT`)
  are invalid. `lintFeatureTags()` runs at config load and fails the run
  before any test is generated.
- **T-4** The linter only catches reserved-looking mistakes. A typo such as
  `@hksit` passes as a free tag and silently widens the scenario to every
  profile. Reviewers must check profile-tag spelling.
- **T-5** Tags follow Gherkin inheritance (Feature → Rule → Scenario →
  Examples). Inherited profile tags combine; keep profile applicability at one
  effective scope.
- **T-6** Free tags (`@smoke`, `@regression`, `@bdd`, `@ticket-123`) are for
  `--grep` / `--grep-invert` filtering only. They never change behavior.

## S — Step Definitions

- **S-1** Import `Given`, `When`, `Then` (and hooks) only from
  `src/fixtures/bddTest.ts`. Never from `playwright-bdd` directly.
- **S-2** Step files must not import `@playwright/test` — not even types.
  Browser and assertion APIs live in `src/pages`. **(lint)**
- **S-3** Step callbacks are plain `async function` so fixtures stay the first
  parameter. No arrow functions. **(lint)**
- **S-4** No `this` / ScenarioWorld in step callbacks. Inject fixtures instead.
  **(lint)**
- **S-5** Step callbacks must not destructure the raw `page` fixture. Inject a
  typed Page Object fixture. **(lint)**
- **S-6** Do not declare classes in `src/steps`. A class there is not a
  compliant Page Object; move it to `src/pages` (see P-1).
- **S-7** Keep a step thin: delegate actions and assertions to Page Objects.
  Do not construct Page Objects inside a step.
- **S-8** Reuse an existing step only when its business meaning and behavior
  genuinely match. Do not create near-duplicate steps for locator differences.
- **S-9** A bare `expect()` in a step fails
  `playwright/no-standalone-expect`. Assertions belong to Page Object methods.
  **(lint)**

```ts
When('the user shows the {string} todos', async function ({ todoFooter }, filterName: string) {
  await todoFooter.showFilter(filterName);
});
```

## X — Fixtures and Scenario Context

- **X-1** Register every new Page Object as a typed fixture in
  `src/fixtures/bddTest.ts`: add it to `PageFixtures`, instantiate it in the
  fixture function, always passing `profile`.

```ts
type PageFixtures = {
  myPage: MyPage;
};

export const test = base.extend<PageFixtures, WorkerFixtures>({
  myPage: async ({ pageContext, profile }, use) => {
    await use(new MyPage(pageContext, profile));
  },
});
```

`pageContext` is a test-scoped fixture created from Playwright's `page`. Every
Page Object in a Scenario receives the same instance and reads its `current`
page through `BasePage`. Keep page switching inside Page Objects; Steps must
not assign `pageContext.current` directly.

- **X-2** Keep the Page Object fixture entries in alphabetical order.
- **X-3** `ctx` is for values passed between steps of the same scenario only.
  Every scenario and retry gets a fresh object. Declare every stored field in
  `ScenarioContext` (in `bddTest.ts`).
- **X-4** Guard `ctx` reads before use; throw a clear error when the producing
  step did not run:

```ts
Then('the url matches', async function ({ ctx, todoPage }) {
  if (!ctx.rememberedUrl) {
    throw new Error('No URL was remembered');
  }
  await todoPage.assertUrlContains(ctx.rememberedUrl);
});
```

- **X-5** `profile` is a worker-scoped project option fixture. It is the only
  way to read environment, region, URLs, and profile settings.
- **X-6** Never read `process.env` in features, steps, pages, or data code.
  Environment selection happens through `--project` and `profile`.
- **X-7** Framework-only environment gates are `STEP_SCREENSHOTS=1` in the
  `AfterStep` hook, `BDD_STEP_IMPLEMENTATION=1` in the development pause
  fixture, CI detection in `playwright.config.ts`, and `TEST_DATA_KEY` in
  `src/utils/encryption.ts`.
- **X-8** After changing a step definition's fixture parameter list or any
  fixture signature, re-run `npm run bddgen`. Generated specs bind fixtures
  explicitly and become stale otherwise.

## P — Page Objects and Locators

- **P-1** Every concrete Page Object extends `BasePage` and declares
  `constructor(pageContext: PageContext, private readonly profile: TestProfile)`
  with `super(pageContext)`. Import `PageContext` from `src/pages/BasePage.ts`.
- **P-2** Navigate only through `this.goto(this.profile.urls.<key>, path)`.
  Never call `page.goto()` directly in a concrete Page Object. `BasePage.goto`
  fails with a profiles.json-pointing error when the URL key is missing for
  the selected profile.
- **P-3** Define a `locators` constant immediately above the class. Include
  only the sections that page uses, in this order. Older files may lack the
  section comments; add them when you touch the file.
  A value a step passes in, such as a Gherkin argument, is used directly in
  the method; it needs no `locators` entry.

```ts
const locators = {
  /* test-id */
  loginButton: 'btn-login-page-login',

  /* text values */
  usernameInput: '1Bank ID',
  passwordInput: 'Password',

  /* selectors - fallback only */
  legacyPanel: '#legacy-panel',
} as const;
```

- **P-4** `test-id` values are passed to `getByTestId()`. A RegExp value is
  allowed when one logical element has region-variant test IDs.
- **P-5** `text values` are passed to semantic methods: `getByRole()`,
  `getByText()`, `getByLabel()`, `getByPlaceholder()`.
- **P-6** `selectors - fallback only` holds CSS or XPath for `locator()` when
  no semantic locator is practical.
- **P-7** Store locator values only. Call Playwright locator methods inside
  Page Object methods, not in the `locators` constant.
- **P-8** Use a selector builder when a fallback selector contains runtime
  data:

```ts
const locators = {
  /* selectors - fallback only */
  assetFilter: (filter: string) => `//button[text()="${filter}"]`,
} as const;
```

- **P-9** Prefer locator methods in this order:

1. `getByTestId()`
2. `getByRole()`
3. `getByText()`
4. `getByLabel()`
5. `getByPlaceholder()`
6. `getByAltText()`
7. `getByTitle()`
8. `locator()` with CSS or XPath

- **P-10** Use `exact: true` for role/text name matching unless a partial
  match is deliberate; comment the deliberate case.
- **P-11** Do not use `.first()` or `.nth()` to silence a strict-mode error.
  Make the element explicit with an accessible name, `filter()`, or a child
  locator. Positional selection is allowed only when order is part of the UI
  contract; add a short comment saying so.

```ts
const product = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Product 2' }) });

await product.getByRole('button', { name: 'Add to cart' }).click();
```

- **P-12** Validate business input at the Page Object boundary. Throw
  ``new Error(`Unsupported <thing>: ${value}`)`` for values outside the
  supported domain instead of letting a locator time out.
  Branch on the supported values inside the method and throw in the remaining
  case; do not keep a separate allowlist of the values a Scenario already
  spells out.
- **P-13** Keep page-specific assertions in Page Objects so locator changes
  stay localized.

## W — Waiting and Assertions

- **W-1** Rely on Playwright action auto-waiting and web-first assertions.
- **W-2** Do not add `waitForSelector()` or a redundant `locator.waitFor()`
  before an action such as `click()`.
- **W-3** No `waitForTimeout()` and no `networkidle`. Wait for an observable
  state or response, never elapsed time. If a fixed wait is truly unavoidable,
  document why the application exposes no ready state.
- **W-4** Assert the user-visible outcome, not an implementation detail.
- **W-5** Central timeouts are the baseline: test 120 s, expect 10 s, action
  10 s, navigation 30 s (`playwright.config.ts`). A per-call override needs a
  comment explaining why.

## D — Test Data

- **D-1** A data-heavy system uses
  `src/data/<system>/{accounts,inputs,expected}/` with `<name>.json` plus a
  typed helper module exporting getters (see
  `src/data/todoMvc/inputs/inputValuesHelper.ts`). A small system may keep a
  single domain module instead.
- **D-2** JSON shape is fixed: `region → env → code` for environment-specific
  data (read with `getNestedDataWithEnv`) or `region → field` for
  region-level data (read with `getNestedData`).
- **D-3** Every region key must exist in every data JSON, even when empty
  (`"tw": {}`). The helpers throw on a missing region.
- **D-4** Access data only through the typed helper functions. Do not import a
  data JSON directly into a page or step.
- **D-5** Model a fixed domain as an `as const` tuple plus derived union, and
  map values with `Record<Union, T>` so tsc catches missing entries.
- **D-6** Each system carries its own copy of `dataHelper.ts`. If you change
  one copy, update the others in the same commit.
- **D-7** `src/config/profiles.json` holds one entry per `<region>-<env>`
  combination. `urls` is required; values must be http(s) and must not end
  with `/` (pages append paths directly). Other top-level fields are free-form,
  non-secret, profile-specific settings.

## SEC — Test Data and Secrets

- **SEC-1** Never commit real production usernames, passwords, tokens,
  certificates, or encryption keys.
- **SEC-2** `src/data/` may contain only non-sensitive data or clearly marked
  placeholder test credentials.
- **SEC-3** Test account passwords are stored as AES-256-GCM ciphertext
  (`"<ivHex>:<authTagHex>:<cipherHex>"`, created with `npm run encrypt`) and
  decrypted at read time via `decrypt()` in `src/utils/encryption.ts`. The key
  comes from `TEST_DATA_KEY` (CI credential) or the git-ignored local
  `.test-data-key` file, and is never committed.
- **SEC-4** Real secrets require an approved CI secret-injection mechanism
  before the tests that need them are enabled.
- **SEC-5** Never print credentials or decrypted values in logs, reports,
  screenshots, error messages, or commit them in plain text.
- **SEC-6** `src/config/profiles.json` contains non-secret configuration only.

## R — Running, Config, and CI

- **R-1** Every executable run selects exactly one project:
  `npm test -- --project=<region>-<env>` on the CLI, or
  `projects: ["<region>-<env>"]` for MCP `test_run`. The `globalSetup` guard
  (`assertProjectPicked.ts`) fails a projectless CLI run before a browser
  opens; only `--ui` is exempt.
- **R-2** `npm test` already runs `bddgen` first. Standalone `npm run bddgen`
  is the binding check: with `missingSteps: 'fail-on-gen'`, an unbound step
  fails generation, not the run. Bind an unfinished step to a guarded
  `developmentPause.at(label)` checkpoint; normal runs then throw a TODO error.
- **R-3** Steps are loaded only from `src/fixtures/bddTest.ts` and
  `src/steps/**/*.ts`; features only from `src/features/**/*.feature`
  (`src/config/framework/paths.ts`). Files outside these globs are silently
  ignored.
- **R-4** `workers: 1` and `fullyParallel: false` are deliberate. Scenarios
  run serially in one worker; never assume parallelism or re-enable it ad hoc.
- **R-5** Adding a region or environment means coordinated edits:
  `REGIONS`/`ENVIRONMENTS` in `src/config/framework/profile.ts`, a matching
  entry in `src/config/profiles.json`, and a `project(...)` line in
  `playwright.config.ts`. The guard fails on any mismatch.
- **R-6** After touching `src/config/framework/`, run the framework self-test:
  `node --test src/config/framework/__tests__/profile-tags/profile-tags.test.mjs`.
- **R-7** CI behavior (`CI` env var set): headless, `retries: 1`, `forbidOnly`
  on, video and trace off. Screenshots are `'on'` in every mode. Locally the
  run is headed with trace and video on.
- **R-8** `STEP_SCREENSHOTS=1` attaches a per-step viewport screenshot in
  reports; it is used by the Jenkins pipeline and is off by default. Every
  change is reviewed with it on once (Q-8).
- **R-9** `TestJenkinsFile` is a test-execution job, not a merge gate. It runs
  `npm ci`, then `npm test -- --project=<region>-<env>` with `CI=true`, then
  uploads the reports. It never runs `npm run lint`, and a failing test only
  marks the build UNSTABLE. Nothing in the pipeline stops non-compliant code
  from landing.

## Q — Definition of Done

Before handing over a change. No pipeline runs these for you (R-9); they are
the author's own gate.

- **Q-1** `npm run lint` passes (it type-checks with tsc, then runs eslint).
- **Q-2** Code is Prettier-formatted (`npm run format`).
- **Q-3** `npm run bddgen` exits 0 and its output was not edited.
- **Q-4** The smallest relevant scenario passes with an explicit `--project`
  (add `--grep "<scenario title>"` to narrow).
- **Q-5** Nothing staged contains `@only`, real credentials, reports,
  screenshots, or generated files.
- **Q-6** Feature files are byte-identical to their baseline unless the change
  is an authorized spec change (F-8).
- **Q-7** No temporary TODO/REVISIT markers remain in changed runtime files.
- **Q-8** Run the changed scenarios once with per-step screenshots on:
  `STEP_SCREENSHOTS=1 npm test -- --project=<region>-<env> --grep "<title>"`.
  Open the report and read every attachment. Each screenshot must show what
  its Gherkin step claims, with the relevant content inside the viewport — no
  spinner, skeleton, half-rendered layout, or still-visible previous page. A
  screenshot caught mid-transition means the Page Object returned before the
  outcome was observable; fix that with a web-first assertion (W-1), never
  with a fixed wait (W-3) or a delay in the `AfterStep` hook. A screenshot
  that fails to capture is only a `console.warn`, so confirm every step has
  one.

## RPT — Reports

- **RPT-1** Playwright HTML report: `reports/playwright-html/`, view with
  `npm run report`.
- **RPT-2** Cucumber HTML report: `reports/cucumber/`, view with
  `npm run report-cucumber`.
- **RPT-3** Cucumber JSON report: `reports/cucumber-report.json`, consumed by
  the QA dashboard upload in CI.
- **RPT-4** Report directories and JSON reports are gitignored; never commit
  them.
