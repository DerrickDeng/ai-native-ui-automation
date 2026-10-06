import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { prepareRun, runCmd } from './helpers';

// Principle 4: steps delegate, POs assert — a bare `expect` in a step
// definition must be caught by eslint (playwright/no-standalone-expect).
// Team syntax: step callbacks use async function and typed Page Object
// fixtures, never arrow callbacks, raw page, Playwright imports, or World/this.

test('S14: step architecture and callback-style violations fail eslint; clean project lints green', () => {
  const dir = prepareRun('s14-lint');

  // Baseline: the template's steps/POs pass the same lint setup.
  const clean = runCmd(dir, ['eslint', 'src/']);
  expect(clean.output.trim()).toBe('');
  expect(clean.status).toBe(0);

  writeFileSync(
    path.join(dir, 'src/steps/bad.steps.ts'),
    `import { expect } from '@playwright/test';
import { Then } from '../fixtures/bddTest';

Then('the bad assertion runs', async function ({ fixtureAppPage }) {
  void fixtureAppPage;
  expect(1).toBe(1);
});
`,
  );

  const bad = runCmd(dir, ['eslint', 'src/steps/bad.steps.ts']);
  expect(bad.status).not.toBe(0);
  expect(bad.output).toContain('no-standalone-expect');

  writeFileSync(
    path.join(dir, 'src/steps/bad-arrow.steps.ts'),
    `import { Then } from '../fixtures/bddTest';

Then('the arrow callback runs', async ({ fixtureAppPage }) => {
  void fixtureAppPage;
});
`,
  );

  const badArrow = runCmd(dir, ['eslint', 'src/steps/bad-arrow.steps.ts']);
  expect(badArrow.status).not.toBe(0);
  expect(badArrow.output).toContain('no-restricted-syntax');

  writeFileSync(
    path.join(dir, 'src/steps/bad-world.steps.ts'),
    `import { Then } from '../fixtures/bddTest';

Then('the legacy world-style state runs', async function ({ fixtureAppPage }) {
  void fixtureAppPage;
  void this;
});
`,
  );

  const badWorld = runCmd(dir, ['eslint', 'src/steps/bad-world.steps.ts']);
  expect(badWorld.status).not.toBe(0);
  expect(badWorld.output).toContain('no-restricted-syntax');

  writeFileSync(
    path.join(dir, 'src/steps/bad-page.steps.ts'),
    `import { When } from '../fixtures/bddTest';

When('the raw page runs', async function ({ page }) {
  await page.getByRole('button', { name: 'Reveal' }).click();
});
`,
  );

  const badPage = runCmd(dir, ['eslint', 'src/steps/bad-page.steps.ts']);
  expect(badPage.status).not.toBe(0);
  expect(badPage.output).toContain('raw page fixture');

  writeFileSync(
    path.join(dir, 'src/steps/bad-import.steps.ts'),
    `import type { Page } from '@playwright/test';
import { Then } from '../fixtures/bddTest';

class MisplacedPageObject {
  constructor(readonly page: Page) {}
}

Then('the misplaced page object runs', async function ({ fixtureAppPage }) {
  void fixtureAppPage;
  void MisplacedPageObject;
});
`,
  );

  const badImport = runCmd(dir, ['eslint', 'src/steps/bad-import.steps.ts']);
  expect(badImport.status).not.toBe(0);
  expect(badImport.output).toContain('no-restricted-imports');
});
