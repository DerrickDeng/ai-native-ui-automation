# Local Workflow Demos

These demos make two bounded AI-assisted workflows observable without using a
company application, account, or network environment. They are demonstrations
of evidence-driven implementation and maintenance—not claims that an Agent can
autonomously repair every UI failure.

Run every command from the repository root. Start and finish with a clean
working tree.

```bash
git status --short
npm ci
```

## Demo A — Implement a missing BDD path

**Purpose:** show that a missing automation path is implemented from a live
runner pause while preserving the authored feature and generated output.

**Fixture:** `filter-narrowing`, against the local QA dashboard (see the
[evals README](../../.claude/skills/playwright-bdd-step-implementor/evals/README.md#the-application-under-test)).

Start only when `git status --short -- src` prints nothing; the cleanup below
restores all of `src/`.

```bash
mkdir -p src/features/_skill-eval src/steps/_skill-eval
cp .claude/skills/playwright-bdd-step-implementor/evals/fixtures/filter-narrowing/scenario.feature src/features/_skill-eval/filter-narrowing.feature
cp .claude/skills/playwright-bdd-step-implementor/evals/fixtures/filter-narrowing/steps.ts src/steps/_skill-eval/filter-narrowing.steps.ts
npx bddgen
```

Run a fresh Agent with the `filter-narrowing` prompt in
[evals.json](../../.claude/skills/playwright-bdd-step-implementor/evals/evals.json).

The review should confirm this sequence:

1. The feature is already authored and the middle step has a TODO stub.
2. `bddgen` succeeds before the debug run starts.
3. The runner pauses after the existing setup, exposing the real browser state.
4. The Agent sets the Region and Date range filters on the live dashboard,
   observes the data reload through Playwright evidence, and implements
   source code only.
5. A focused replay passes without changing the feature or hand-editing
   `tests/.features-gen/**`.

Record the selected project, the actual pause, locator evidence, changed source
files, replay count, focused result, and the invariant checks below.

```bash
npm run lint
git diff -- src/features/
git diff -- tests/.features-gen/
rm -rf src/features/_skill-eval src/steps/_skill-eval
git restore src/
npx bddgen
git status --short
```

## Demo B — Repair a stale locator

**Purpose:** show a governed repair of a fully bound, previously-green scenario.

**Fixture:** `run-report`, against the same local QA dashboard as Demo A.

Start only when `git status --short -- src` prints nothing; the cleanup below
restores all of `src/`.

```bash
mkdir -p src/features/_skill-eval src/steps/_skill-eval
cp .claude/skills/playwright-bdd-test-healer/evals/fixtures/run-report/scenario.feature src/features/_skill-eval/run-report.feature
cp .claude/skills/playwright-bdd-test-healer/evals/fixtures/run-report/steps.ts src/steps/_skill-eval/run-report.steps.ts
npx bddgen
```

Run a fresh Agent with the `run-report` prompt in
[evals.json](../../.claude/skills/playwright-bdd-test-healer/evals/evals.json).

The review should confirm this sequence:

1. The focused `hk-sit` scenario fails at the seeded stale locator.
2. The Agent classifies the issue as a locator regression, not a business-spec
   or data failure.
3. It stops a debug run at the failing line and derives the replacement from
   live browser evidence rather than snapshot text.
4. The repair lands in source Page Object/fixture/step architecture—not in the
   feature or generated spec—and introduces no `fixme`, skip, or fixed wait.
5. The exact scenario, BDD generation, and lint all pass.

```bash
npm run lint
git diff -- src/features/
git diff -- tests/.features-gen/
rm -rf src/features/_skill-eval src/steps/_skill-eval
git restore src/
npx bddgen
git status --short
```

## Operator rules

- Run one Agent session at a time: the staged files and the debug runner are
  shared.
- Each application run must select an explicit project; use `hk-sit` for these
  fixtures.
- Do not stage both demos together.
- Treat a browser or dashboard infrastructure failure as `invalid`, not as an Agent
  pass or failure.
- Do not report a self-declared Agent result without checking the changed files
  and focused run yourself.
- Preserve raw transcripts and add the run to the
  [evaluation scorecard](../evaluation/scorecard.md).

## Five-minute walkthrough

1. Explain the risk: an LLM can make UI tests green by changing the wrong
   artifact or relying on state the runner never produced.
2. Demo A: show the runner pause, browser evidence, source-only implementation,
   generation gate, and focused replay.
3. Demo B: show the same controls applied to maintenance of an existing test.
4. Close with the evidence boundary: deterministic gates verify mechanics;
   judgment evals measure Agent decisions; human review owns semantic and
   release decisions.

The locally available fixtures demonstrate the workflow. They are not a claim
that every model has been qualified or that the framework replaces human
release ownership.
