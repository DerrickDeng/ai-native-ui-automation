import { appendFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { bddgen, prepareRun } from './helpers';

// Phase 1 of the skill: bddgen is the single discovery mechanism. These tests
// pin its three exits (SKILL.md "Discovery") without launching a browser.

const TODO_STUB = `import { When } from '../fixtures/bddTest';

When('I do something unbound', async function ({}) {
  throw new Error('TODO: implement — observe live page at this pause point');
});
`;

test('S1: all steps bound -> bddgen exits 0', () => {
  const dir = prepareRun('s1-all-bound');
  const result = bddgen(dir);
  expect(result.output).not.toContain('Missing step definitions');
  expect(result.status).toBe(0);
});

test('S2: unbound step -> exit 1 with ready-to-paste snippet and feature:line reference', () => {
  const dir = prepareRun('s2-missing-step');
  appendFileSync(path.join(dir, 'src/features/basic.feature'), '\n  Scenario: An unbound scenario\n    When I do something unbound\n');

  const result = bddgen(dir);

  expect(result.status).not.toBe(0);
  expect(result.output).toContain('Missing step definitions: 1');
  // The snippet is ready to paste: correct keyword + quoted step text.
  expect(result.output).toContain("When('I do something unbound'");
  // And it references the feature file + line so the skill can locate it.
  expect(result.output).toMatch(/From: src[/\\]features[/\\]basic\.feature:\d+:\d+/);
});

test('S3: two definitions matching one step -> ambiguity error listing both file:line', () => {
  const dir = prepareRun('s3-ambiguous');
  writeFileSync(
    path.join(dir, 'src/steps/duplicate.steps.ts'),
    `import { When } from '../fixtures/bddTest';

When('I click the reveal button', async ({ fixtureAppPage }) => {
  await fixtureAppPage.clickReveal();
});
`,
  );

  const result = bddgen(dir);

  expect(result.status).not.toBe(0);
  expect(result.output).toContain('Multiple definitions matched scenario step');
  // Both candidates are listed with file:line, so one can be deleted/tightened.
  expect(result.output).toMatch(/duplicate\.steps\.ts:\d+/);
  expect(result.output).toMatch(/fixture-app\.steps\.ts:\d+/);
});

test('S4: an empty-fixture TODO stub binds without granting browser access', () => {
  const dir = prepareRun('s4-stub');
  appendFileSync(path.join(dir, 'src/features/basic.feature'), '\n  Scenario: A stubbed scenario\n    When I do something unbound\n');
  writeFileSync(path.join(dir, 'src/steps/stub.steps.ts'), TODO_STUB);

  const result = bddgen(dir);

  expect(result.output).not.toContain('Missing step definitions');
  expect(result.status).toBe(0);
});

test('S5: missing Scenario Outline template step is reported ONCE despite 3 Examples rows', () => {
  const dir = prepareRun('s5-outline-dedupe');
  writeFileSync(
    path.join(dir, 'src/features/extra-outline.feature'),
    `Feature: Outline with an unbound template step

  Scenario Outline: Mention a word
    Then the page should mention "<word>"

    Examples:
      | word  |
      | one   |
      | two   |
      | three |
`,
  );

  const result = bddgen(dir);

  expect(result.status).not.toBe(0);
  // One definition serves all rows -> reported missing exactly once.
  expect(result.output).toContain('Missing step definitions: 1');
});
