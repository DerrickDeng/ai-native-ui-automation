# Skill smoke suite — `playwright-bdd-step-implementor`

Protects the functional points of `.claude/skills/playwright-bdd-step-implementor/SKILL.md`.
The skill is an agent workflow; what CAN break underneath it is the toolchain
mechanics it relies on. This suite pins those mechanics.

This directory also hosts the deterministic coverage for the sibling skill
`playwright-bdd-test-healer` (rows H1, Q4, Q7, and the shared A1 architecture
contract); `npm run test:skills` is the single gate for both skills. Do not
delete or relocate this directory without moving that coverage.

## How to run

```bash
npm run test:skills                # deterministic gate: hermetic fixture-project E2E + repo contract checks (no application network)
npm test -- --project=hk-sit       # optional environment-connected layer
```

## Architecture

- `fixture-project/` — a minimal but real playwright-bdd project (same config
  shape as the main repo: combo-specific generation, `missingSteps: 'fail-on-gen'`, ctx fixture,
  PO-delegating steps, and `src/features/`). Its page under test is `app/index.html`, opened via
  `file://` — every run is true E2E (bddgen → playwright → headless Chrome →
  page), just without the network.
- `tests/` — the harness. The fixture-project specs (`compile-contracts`,
  `run-mechanics`, `env-selection`, `lint-guard`, `healer-mechanics`) each copy
  `fixture-project/` to `.runs/<name>/` (kept inside the repo so the root
  `node_modules` resolves), optionally mutate it (delete a step definition,
  duplicate one, skip a re-gen…), then drive `npx bddgen` / `npx playwright
test` as child processes — real headless-Chrome E2E — and assert on exit
  codes and output. The remaining specs (`skill-contracts`,
  `architecture-contracts`, `framework-config`, `ci-video-config`) are static
  contract checks that read the live repo root and open no browser.
- Why not test everything on the connected application: half the functional points require
  _breaking_ the project (missing steps, ambiguity, stale gen). A live site
  adds flake and can't be broken on purpose. The live layer only needs to
  prove current business scenarios work in the selected environment. The
  hermetic suite remains the required deterministic E2E gate.

## Coverage matrix

| #      | SKILL.md functional point                                                                                                                                                                                                                  | Test                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| S1     | Phase 1: all steps bound → `bddgen` exit 0                                                                                                                                                                                                 | compile-contracts              |
| S2     | Phase 1: missing step → exit 1, `Missing step definitions: N`, ready-to-paste snippet + `From: feature:line`                                                                                                                               | compile-contracts              |
| S3     | Phase 1: ambiguous step → `Multiple definitions matched`, both definitions with file:line                                                                                                                                                  | compile-contracts              |
| S4     | Phase 2: TODO-throw stub counts as bound (`bddgen` passes)                                                                                                                                                                                 | compile-contracts              |
| S5     | Outline: missing template step reported ONCE despite N Examples rows                                                                                                                                                                       | compile-contracts              |
| S6     | Development checkpoint fails closed in normal execution after real earlier steps execute                                                                                                                                                   | run-mechanics                  |
| S7     | ctx fixture: producer/consumer works; fresh per scenario (no leak)                                                                                                                                                                         | run-mechanics (green pipeline) |
| S8     | Fixtures are lazy; setup/teardown wrap the scenario, exactly once                                                                                                                                                                          | run-mechanics (green pipeline) |
| S9     | Outline expands to one independent test per row, named `Example #N`                                                                                                                                                                        | run-mechanics (green pipeline) |
| S10    | Revisit: body-only edits preserve bindings, but both new runs pass the generation gate; module counter pauses at k-th execution and resets per run                                                                                         | run-mechanics                  |
| S11    | Deliberately bypassing the gate demonstrates stale fixture injection (`Cannot read properties of undefined`); regeneration heals it                                                                                                        | run-mechanics                  |
| S12    | Principle 1/Phase 4: feature files byte-identical after the pipeline                                                                                                                                                                       | run-mechanics (green pipeline) |
| S13    | Applicability generation: exact profile tags form an allowlist per combo; untagged scenarios reach every combo; `@wip` is excluded; matching profiles run green                                                                            | env-selection                  |
| S14    | Principle 4: bare `expect` in a step fails `playwright/no-standalone-expect`; clean project lints green                                                                                                                                    | lint-guard                     |
| H1     | Healer loop: reproduction and verification use the same pre-run generation gate while repairing a PO locator regression without feature edits                                                                                              | healer-mechanics               |
| A1     | Architecture: every concrete Page Object extends `BasePage` and is constructed through a typed fixture                                                                                                                                     | architecture-contracts         |
| Q1–Q11 | Skill metadata, project/source protection, TODO boundaries, Q4 healer evidence layers, Q5 interface metadata, Q6 implementor/Q7 healer eval fixture completeness, focused validation, Page Object architecture, and concrete path validity | skill-contracts                |
| Q12    | The evidence-first structure exposes the ordered CLI checkpoint lifecycle, separate entry paths, applicable additional rules, and reload-only restart rule                                                                              | skill-contracts                |
| Q13    | Four references have singular phase responsibilities; normal adaptive evidence remains in core while exception escalation remains in debug guidance                                                                                        | skill-contracts                |
| Q14    | Core routes directly to four authoritative references and cites no obsolete filename                                                                                                                                                       | skill-contracts                |
| Q15    | The mandatory generation gate independently protects each core, revisit, recovery, and failed-generation runner route                                                                                                                      | skill-contracts                |
| Q16    | Locator provenance: guardrails pin every locator to a CLI action echo, generated locator, or the test-id query (DOM fallback last), and keep that query downstream of a real failure                                                                          | skill-contracts                |
| F1–F4  | Main framework implementation: applicability expression, tag lint, profile builder and project guard                                                                                                                                       | framework-config               |
| live   | Current business flows pass when the selected internal environment and approved secrets are available                                                                                                                                      | `npm test -- --project=hk-sit` |

## Not covered (agent judgment, not mechanics)

These are decisions the agent makes while running the skill — they need skill
evals (skill-creator), not smoke tests:

Q1–Q16 are static contract checks for documented structure and wiring. Judgment
evals separately grade workflow-routing decisions; S9 and S10 exercise the
underlying Scenario Outline and completed-step revisit mechanics, respectively.

- Pause triage (deciding flaky vs regression at a wrong pause point)
- Principle 2 stop-on-proven-impossibility judgment
- Locator quality choices (testid scan, role+name preference)
- Live Playwright CLI attachment, pause, and resume calls themselves

## Maintenance notes

- The harness strips inherited `PLAYWRIGHT*` / `PW_*` / `TEST_*` env vars
  before spawning children — the harness itself runs inside Playwright Test,
  and a leaked var makes child `bddgen` fail with "no BDD configs found".
- Assertion strings (`Missing step definitions:`, `Multiple definitions
matched`, `Cannot read properties of undefined`) were calibrated against
  playwright-bdd 9.2.1. A pinned-version bump that changes wording will turn
  these tests red — that is intentional: it means the skill doc's quoted
  outputs need re-validation too.
- `.runs/` is disposable and gitignored.
