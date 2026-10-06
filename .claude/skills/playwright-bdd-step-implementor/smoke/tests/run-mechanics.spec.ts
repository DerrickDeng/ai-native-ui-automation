import { appendFileSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { bddgen, CmdResult, GREEN_ARGS, prepareRun, pwTest } from './helpers';

// Phase 3/4 mechanics plus the Revisit and stale-gen gotchas. These are true
// E2E runs: real bddgen -> real playwright -> headless Chrome -> local page.

const TEMPLATE_DIR = path.resolve(__dirname, '../fixture-project');
const REPO_ROOT = path.resolve(__dirname, '../../../../..');

test.describe('green pipeline (all steps bound, one shared run)', () => {
  let dir: string;
  let genResult: CmdResult;
  let runResult: CmdResult;

  test.beforeAll(() => {
    dir = prepareRun('green-pipeline');
    genResult = bddgen(dir);
    if (genResult.status !== 0) {
      throw new Error(`bddgen failed before the green-pipeline runner:\n${genResult.output}`);
    }
    runResult = pwTest(dir, GREEN_ARGS);
  });

  test('S7: full suite passes — includes ctx producer/consumer and cross-scenario isolation', () => {
    expect(genResult.status).toBe(0);
    expect(runResult.status).toBe(0);
    // The ctx scenarios actually ran (they are the World-replacement proof).
    expect(runResult.output).toContain('Remember a value and use it later');
    expect(runResult.output).toContain('Context does not leak between scenarios');
  });

  test('S8: lazy fixture ran setup + teardown exactly once, in order', () => {
    // Only teardown.feature consumes the journal fixture; every other scenario
    // must not trigger it (fixtures are lazy), and teardown follows setup.
    const journal = readFileSync(path.join(dir, '.journal.log'), 'utf8');
    expect(journal).toBe('setup\nteardown\n');
  });

  test('S9: Scenario Outline expanded to one independent test per Examples row', () => {
    for (const n of [1, 2, 3]) {
      expect(runResult.output).toContain(`Example #${n}`);
    }
  });

  test('S12: feature files are byte-identical after the whole pipeline', () => {
    const features = readdirSync(path.join(TEMPLATE_DIR, 'src/features'));
    expect(features.length).toBeGreaterThan(0);
    for (const file of features) {
      const original = readFileSync(path.join(TEMPLATE_DIR, 'src/features', file), 'utf8');
      const afterRun = readFileSync(path.join(dir, 'src/features', file), 'utf8');
      expect(afterRun, `src/features/${file} must be untouched`).toBe(original);
    }
  });
});

test('S6: guarded checkpoint fails closed in normal execution after earlier steps ran', () => {
  const dir = prepareRun('s6-pause');
  copyFileSync(path.join(REPO_ROOT, 'src/fixtures/developmentPause.ts'), path.join(dir, 'src/fixtures/developmentPause.ts'));
  appendFileSync(
    path.join(dir, 'src/features/basic.feature'),
    '\n  Scenario: Paused scenario\n    Given I open the fixture app\n    When I do something unbound\n',
  );
  writeFileSync(
    path.join(dir, 'src/steps/stub.steps.ts'),
    `import { When } from '../fixtures/bddTest';
import { createDevelopmentPause } from '../fixtures/developmentPause';

When('I do something unbound', async function ({ page }) {
  await createDevelopmentPause(() => page).at('do-something-unbound');
});
`,
  );

  expect(bddgen(dir).status).toBe(0);
  const result = pwTest(dir, ['-g', 'Paused scenario']);

  // A normal run cannot turn an unfinished development checkpoint green.
  expect(result.status).not.toBe(0);
  expect(result.output).toContain('TODO remains: do-something-unbound');
});

test('S10: Revisit — module-level counter pauses at the 2nd execution and resets per run', () => {
  const dir = prepareRun('s10-counter');
  const stepsFile = path.join(dir, 'src/steps/fixture-app.steps.ts');
  const original = readFileSync(stepsFile, 'utf8');
  const anchor = "When('I switch to the {string} tab', async function ({ fixtureAppPage }, tabName: string) {";
  expect(original).toContain(anchor);
  const mutated = original.replace(
    anchor,
    `let hits = 0;
${anchor}
  if (++hits === 2) throw new Error(\`REVISIT at \${tabName}\`);`,
  );
  writeFileSync(stepsFile, mutated);

  // The body-only change leaves bindings unchanged, but every new run still
  // passes the generation gate.
  expect(bddgen(dir).status).toBe(0);
  const first = pwTest(dir, ['-g', 'Switch through all tabs']);
  expect(first.status).not.toBe(0);
  // Paused at the 2nd execution (Beta), not the 1st (Alpha) or 3rd (Gamma).
  expect(first.output).toContain('REVISIT at Beta');

  // Fresh worker process per run -> the counter resets automatically.
  expect(bddgen(dir).status).toBe(0);
  const second = pwTest(dir, ['-g', 'Switch through all tabs']);
  expect(second.status).not.toBe(0);
  expect(second.output).toContain('REVISIT at Beta');
});

test('S11: bypassing the generation gate can run stale fixture bindings; regeneration heals it', () => {
  const dir = prepareRun('s11-stale-gen');
  expect(bddgen(dir).status).toBe(0);

  // Swap the step's fixture from { fixtureAppPage } to { page } WITHOUT
  // re-running bddgen — the stale generated spec still injects the old one.
  const stepsFile = path.join(dir, 'src/steps/fixture-app.steps.ts');
  const original = readFileSync(stepsFile, 'utf8');
  const before = `When('I click the reveal button', async function ({ fixtureAppPage }) {
  await fixtureAppPage.clickReveal();
});`;
  const after = `When('I click the reveal button', async function ({ page }) {
  await page.getByRole('button', { name: 'Reveal' }).click();
});`;
  expect(original).toContain(before);
  writeFileSync(stepsFile, original.replace(before, after));

  // Intentional forbidden-path negative control: this is the only stale run
  // that deliberately bypasses the generation gate.
  const stale = pwTest(dir, ['-g', 'Reveal the secret']);
  expect(stale.status).not.toBe(0);
  expect(stale.output).toContain('Cannot read properties of undefined');

  // The skill's rule: "bddgen before every debug/run". Re-gen must heal it.
  expect(bddgen(dir).status).toBe(0);
  const fresh = pwTest(dir, ['-g', 'Reveal the secret']);
  expect(fresh.status).toBe(0);
});
