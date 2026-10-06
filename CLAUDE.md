# CLAUDE.md

UI test framework built on **playwright-bdd 9.2.1** and
**@playwright/test 1.62.1**, both pinned. Gherkin features compile to Playwright
tests at generation time. A Playwright **project** = one `<region>-<env>` combination (today:
hk, sg, tw × sit, uat), defined by `src/config/framework/profile.ts` ×
`src/config/profiles.json`.

`CodeRules.md` is the coding law. Cite its rule IDs (`G-1`, `P-2`, …) in
reviews. This file is orientation only; when they disagree, CodeRules.md wins.

## Commands

```bash
npm test -- --project=hk-sit                      # run one profile (bddgen runs first)
npm test -- --project=hk-sit --grep "<scenario>"  # run one scenario
npm run bddgen                                    # generate + check step bindings
npm run lint                                      # tsc --noEmit + eslint
npm run format                                    # prettier
npm run test:skills                               # smoke gate for .claude/skills
npm run report / report-cucumber                  # open HTML reports
node --test src/config/framework/__tests__/profile-tags/profile-tags.test.mjs  # framework self-test
```

`--project` is mandatory: a projectless `npm test` fails in globalSetup before
any browser opens (`--ui` is exempt).

## Layout

| Path                               | Role                                                             |
| ---------------------------------- | ---------------------------------------------------------------- |
| `src/features/<system>/`           | Gherkin specs. Frozen; no selectors (F-8, G-1)                   |
| `src/steps/<system>/`              | Thin delegation to Page Objects, lint-guarded (S-1…S-9)          |
| `src/pages/`                       | `BasePage` + concrete Page Objects owning all locators (P-*)     |
| `src/fixtures/bddTest.ts`          | Fixture registry, `ctx`, the only legal `Given/When/Then` source |
| `src/fixtures/developmentPause.ts` | Guarded Step implementation checkpoint                           |
| `src/data/<system>/`               | JSON data + typed helper getters (D-*)                           |
| `src/config/profiles.json`         | Per-combination URLs and settings (user config)                  |
| `src/config/framework/`            | Profile types, tag lint, applicability, project guard            |
| `src/utils/encryption.ts`          | AES-GCM decrypt for stored test passwords; key never committed   |
| `tests/.features-gen/`             | Generated tests — never edit (G-5)                               |
| `.claude/skills/`                  | Implementation, healing, and requirement-context skills          |

Real reference system: `todoMvc`. Copy its shape for new code.

## Non-negotiables

- Always pick exactly one project per run (R-1).
- Never edit anything under `tests/.features-gen/` (G-5).
- Never reword a committed `.feature` file to make automation pass (F-8).
- Steps: `async function` callbacks only, import from `bddTest.ts` only, no
  `@playwright/test` imports, no raw `page`, no classes (S-1…S-6).
- Page Objects: `extends BasePage`, `constructor(pageContext, private readonly
profile)`, navigate via `this.goto(this.profile.urls.<key>, path)` — never
  `page.goto()` (P-1, P-2).
- Register every new Page Object as a typed fixture in `bddTest.ts`,
  alphabetically, passing the shared `pageContext` and `profile` (X-1, X-2).
- Features, steps, pages, and data use `profile`, never `process.env` (X-5, X-6).
  The framework-only gates are listed in X-7.
- Applicability tags are exact profile names (`@hk-sit`). A typo like
  `@hksit` is NOT caught by the linter and silently runs everywhere (T-2, T-4).
- Re-run `npm run bddgen` after any fixture or step-signature change (X-8).

## How a scenario executes

```
src/features/todoMvc/todoList.feature         When the user adds the todo "groceries"
  → npm run bddgen
  → tests/.features-gen/hk-sit/src/features/todoMvc/todoList.feature.spec.js
  → src/steps/todoMvc/todoPage.steps.ts       When('the user adds the todo {string}', …)
  → src/fixtures/bddTest.ts                   todoPage: new TodoPage(pageContext, profile)
  → src/pages/todoMvc/TodoPage.ts             locators const → addTodo(todoCode)
  → src/data/todoMvc/inputs/inputValuesHelper.ts   getInputValue(region, env, code)
  → this.goto(this.profile.urls.todoMvc, '')  URL from src/config/profiles.json
```

`pageContext` is test-scoped and initialized on demand from Playwright's
`page`. All Page Objects in one Scenario share it; `BasePage.page` reads its
`current` value on every access. Keep page switching in a Page Object, not a
Step. `ctx` is for values passed between steps, not browser `Page` instances.
Popup capture and tab-selection methods are not implemented yet.

Tag filtering happens at generation time: each project generates only the
scenarios whose profile-tag allowlist includes it; untagged scenarios generate
everywhere; `@wip` generates nowhere (T-2).

## Gotchas

- Nothing runs `npm run lint` for you. The Jenkins job runs `npm test` only,
  and a failing test just marks the build UNSTABLE. Run lint and `bddgen`
  yourself before handing work over (R-9, Q-1).
- Unbound steps fail `bddgen` (`missingSteps: 'fail-on-gen'`), not the run.
  Follow the step-implementor skill's guarded development checkpoint flow (R-2).
- Steps outside `src/steps/**/*.ts` are silently ignored (R-3).
- A stale generated tree after a fixture change fails with
  `Cannot read properties of undefined` — regenerate (X-8).
- `workers: 1`, serial by design; do not parallelize (R-4).
- Screenshots are always on; trace/video are on locally, off in CI (R-7).
- `STEP_SCREENSHOTS=1` adds per-step report screenshots (Jenkins uses it).
- `.env` is an intentionally empty sentinel; nothing loads it.

## Skills and references

- Implement missing/new step definitions: `playwright-bdd-step-implementor`
  skill. Fix previously-green regressed tests: `playwright-bdd-test-healer`.
- When a business decision needs cross-Story context, use
  `.claude/skills/requirement-context-retrieval/SKILL.md`. It selects only a
  matching requirements Wiki, verifies decisive citations against the original
  Story or note, and treats stale or missing sources as unresolved. The
  implementor invokes it on demand; the authored Gherkin remains the scope.
- `.claude/skills/**` changes must keep `npm run test:skills` green — it also
  asserts on SKILL.md content and `src/pages` architecture (A1).
- `.claude/skills/playwright-trace/` and `.claude/skills/playwright-cli/` are
  Playwright's own skills; the healer links to both. Do not edit them
  (`.prettierignore` skips them). Refresh them after an upgrade:
  `npx playwright trace install-skill` for `@playwright/test`, and
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 playwright-cli install --skills` (then
  delete the empty `.playwright/` it creates) for the global `playwright-cli`.
