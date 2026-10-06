// Run manually: node --test src/config/framework/__tests__/profile-tags/profile-tags.test.mjs

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { after, before, test } from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');
const BDDGEN = path.join(REPO_ROOT, 'node_modules/.bin/bddgen');
const PLAYWRIGHT = path.join(REPO_ROOT, 'node_modules/.bin/playwright');
const TAG_CONFIG = path.join(import.meta.dirname, 'playwright.config.ts');
const LINT_CONFIG = path.join(import.meta.dirname, 'lint.config.ts');

const TITLES = [
  'Feature scoped profile tag',
  'Rule scoped profile tag',
  'Scenario scoped profile tag',
  'Outline scoped profile tag',
  'Examples scoped profile tag',
  'No profile tag applies everywhere',
  'Multiple exact profile tags form an allowlist',
  'Inherited profile tags are combined',
];

const tempDirs = [];

function run(command, args, env = process.env) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function list(profile, options = {}) {
  const args = ['test', '-c', TAG_CONFIG, '--project', profile, '--list', '--pass-with-no-tests'];
  if (options.grep) args.push('--grep', options.grep);
  if (options.grepInvert) args.push('--grep-invert', options.grepInvert);
  return run(PLAYWRIGHT, args);
}

function execute(profile, options = {}) {
  const args = ['test', '-c', TAG_CONFIG, '--project', profile, '--reporter', 'line'];
  if (options.grep) args.push('--grep', options.grep);
  if (options.grepInvert) args.push('--grep-invert', options.grepInvert);
  return run(PLAYWRIGHT, args);
}

function assertTitles(output, expected) {
  for (const title of TITLES) {
    assert.equal(
      output.includes(title),
      expected.includes(title),
      `${title} had an unexpected discovery result`,
    );
  }
}

function lint(tags) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-tag-lint-'));
  tempDirs.push(tempDir);
  fs.writeFileSync(
    path.join(tempDir, 'lint.feature'),
    `${tags}\nFeature: Lint fixture\n\n  Scenario: Lint tags\n    Given a placeholder\n`,
  );
  return run(PLAYWRIGHT, ['test', '-c', LINT_CONFIG, '--list', '--pass-with-no-tests'], {
    ...process.env,
    TAG_LINT_FEATURES: tempDir,
  });
}

function lintError(tags) {
  try {
    lint(tags);
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  assert.fail(`Expected lint to reject: ${tags}`);
}

before(() => {
  run(BDDGEN, ['-c', TAG_CONFIG]);
});

after(() => {
  for (const tempDir of tempDirs) fs.rmSync(tempDir, { recursive: true, force: true });
});

test('exact profile tags and all supported Gherkin tag positions control discovery', () => {
  const global = 'No profile tag applies everywhere';
  const matrix = {
    'hk-sit': [
      'Feature scoped profile tag',
      'Multiple exact profile tags form an allowlist',
      'Inherited profile tags are combined',
      global,
    ],
    'hk-uat': ['Outline scoped profile tag', global],
    'sg-sit': [
      'Rule scoped profile tag',
      'Multiple exact profile tags form an allowlist',
      'Inherited profile tags are combined',
      global,
    ],
    'sg-uat': ['Examples scoped profile tag', global],
    'tw-sit': ['Scenario scoped profile tag', global],
    'tw-uat': [global],
  };

  for (const [profile, expected] of Object.entries(matrix)) {
    assertTitles(list(profile), expected);
  }
});

test('ordinary tags work with --grep at every supported Gherkin tag position', () => {
  const cases = [
    ['hk-sit', '@feature-grep', 'Feature scoped profile tag'],
    ['sg-sit', '@rule-grep', 'Rule scoped profile tag'],
    ['tw-sit', '@scenario-grep', 'Scenario scoped profile tag'],
    ['hk-uat', '@outline-grep', 'Outline scoped profile tag'],
    ['sg-uat', '@examples-grep', 'Examples scoped profile tag'],
    ['tw-uat', '@global-grep', 'No profile tag applies everywhere'],
  ];

  for (const [profile, grep, title] of cases) {
    assertTitles(list(profile, { grep }), [title]);
  }
});

test('ordinary inherited tags remain grep-able without changing profile applicability', () => {
  assertTitles(list('sg-sit', { grep: '@feature-inherited-grep' }), [
    'Inherited profile tags are combined',
  ]);
  assertTitles(list('sg-sit', { grep: '@scenario-inherited-grep' }), [
    'Inherited profile tags are combined',
  ]);
  assertTitles(list('sg-uat', { grep: '@feature-inherited-grep' }), []);
});

test('--grep-invert excludes ordinary tags without changing profile applicability', () => {
  const output = list('hk-sit', { grepInvert: '@global-grep' });
  assert.equal(output.includes('No profile tag applies everywhere'), false);
  assert.equal(output.includes('Feature scoped profile tag'), true);
});

test('grep-filtered BDD scenarios execute successfully', () => {
  assert.match(execute('hk-sit', { grep: '@feature-grep' }), /1 passed/);
  assert.match(execute('tw-uat', { grep: '@smoke' }), /1 passed/);
  assert.match(execute('hk-sit', { grepInvert: '@global-grep' }), /3 passed/);
});

test('lint accepts exact profile tags and unrelated business tags', () => {
  assert.doesNotThrow(() =>
    lint('@hk-sit @hk-uat @sg-sit @sg-uat @tw-sit @tw-uat @smoke @regression @ticket-123'),
  );
});

test('lint rejects legacy dimension tags regardless of case', () => {
  for (const tag of ['@hk', '@HK', '@hK', '@sg', '@tw', '@sit', '@Sit', '@uat', '@UAT']) {
    assert.match(lintError(tag), /dimension tags are not supported/);
  }
});

test('lint rejects malformed, uppercase, and unknown profile-like tags', () => {
  assert.match(lintError('@HK-SIT'), /tags are lowercase, use @hk-sit/);
  for (const tag of ['@hk_sit', '@hk-prod', '@jp-sit', '@sit-only']) {
    assert.match(lintError(tag), /invalid profile tag/);
  }
});
