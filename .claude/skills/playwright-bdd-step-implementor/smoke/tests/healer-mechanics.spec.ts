import { readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { bddgen, prepareRun, pwTest } from './helpers';

test('H1: a Page Object regression is reproduced, repaired, and verified without feature edits', () => {
  const dir = prepareRun('h1-healer-loop');
  const featureFile = path.join(dir, 'src/features/basic.feature');
  const pageFile = path.join(dir, 'src/pages/FixtureAppPage.ts');
  const featureBaseline = readFileSync(featureFile, 'utf8');
  const pageBaseline = readFileSync(pageFile, 'utf8');

  const brokenPage = pageBaseline.replace(
    "getByRole('button', { name: 'Reveal' }).click()",
    "getByRole('button', { name: 'Missing Reveal' }).click({ timeout: 500 })",
  );
  expect(brokenPage).not.toBe(pageBaseline);
  writeFileSync(pageFile, brokenPage);

  expect(bddgen(dir).status).toBe(0);
  const failing = pwTest(dir, ['--grep', 'Reveal the secret content']);
  expect(failing.status).not.toBe(0);
  expect(failing.output).toContain('Missing Reveal');

  // The repair leaves bindings unchanged, but verification still passes the gate.
  writeFileSync(pageFile, pageBaseline);
  expect(bddgen(dir).status).toBe(0);
  const repaired = pwTest(dir, ['--grep', 'Reveal the secret content']);
  expect(repaired.status).toBe(0);
  expect(readFileSync(featureFile, 'utf8')).toBe(featureBaseline);
});
