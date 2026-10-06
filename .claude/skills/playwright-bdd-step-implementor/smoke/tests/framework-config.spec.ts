import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { applicabilityExpression } from '../../../../../src/config/framework/applicability';
import assertProjectPicked from '../../../../../src/config/framework/assertProjectPicked';
import { buildProfile } from '../../../../../src/config/framework/profile';
import { lintFeatureTags } from '../../../../../src/config/framework/tagLint';

test('F1: main applicability expression is an exact-profile-tag allowlist', () => {
  const noProfileTag = 'not @hk-sit and not @hk-uat and not @sg-sit and not @sg-uat and not @tw-sit and not @tw-uat';
  expect(applicabilityExpression('hk', 'sit')).toBe(`(@hk-sit or (${noProfileTag})) and not @wip`);
  expect(applicabilityExpression('tw', 'uat')).toBe(`(@tw-uat or (${noProfileTag})) and not @wip`);
});

test('F2: main tag lint accepts business tags and rejects malformed profile tags', () => {
  const featuresDir = test.info().outputPath('features');
  mkdirSync(featuresDir, { recursive: true });
  const feature = `${featuresDir}/tags.feature`;

  try {
    writeFileSync(feature, '@bdd @wip @hk-sit @hk-uat @cc-feature\nFeature: valid tags\n');
    expect(() => lintFeatureTags(featuresDir)).not.toThrow();

    writeFileSync(feature, '@HK-SIT\nFeature: uppercase profile tag\n');
    expect(() => lintFeatureTags(featuresDir)).toThrow(/tags are lowercase, use @hk-sit/);

    writeFileSync(feature, '@hk\nFeature: dimension tag\n');
    expect(() => lintFeatureTags(featuresDir)).toThrow(/dimension tags are not supported/);

    writeFileSync(feature, '@hk-only\nFeature: reserved-looking tag\n');
    expect(() => lintFeatureTags(featuresDir)).toThrow(/invalid profile tag/);
  } finally {
    rmSync(featuresDir, { recursive: true, force: true });
  }
});

test('F2b: main tag lint defaults to src/features', () => {
  const originalCwd = process.cwd();
  const root = test.info().outputPath('tag-lint-default-root');
  const featuresDir = path.join(root, 'src/features');
  const feature = path.join(featuresDir, 'tags.feature');
  mkdirSync(featuresDir, { recursive: true });

  try {
    process.chdir(root);
    writeFileSync(feature, '@bdd @hk-sit\nFeature: valid default path\n');
    expect(() => lintFeatureTags()).not.toThrow();

    writeFileSync(feature, '@HK-SIT\nFeature: invalid default path\n');
    expect(() => lintFeatureTags()).toThrow(/tags are lowercase, use @hk-sit/);
  } finally {
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test('F3: main profile builder returns the selected frozen combo', () => {
  const profile = buildProfile('uat', 'sg');
  expect(profile.environment).toBe('uat');
  expect(profile.region).toBe('sg');
  expect(profile.urls).toBeDefined();
  expect(Object.isFrozen(profile)).toBe(true);
});

test('F4: main project guard checks profile consistency and explicit CLI selection', () => {
  const profile = buildProfile('sit', 'hk');
  const config = {
    projects: [{ name: 'hk-sit', use: { profile } }],
  } as unknown as FullConfig;
  const mismatched = {
    projects: [{ name: 'sg-sit', use: { profile } }],
  } as unknown as FullConfig;
  const originalArgv = [...process.argv];

  try {
    process.argv.splice(0, process.argv.length, process.execPath, 'playwright', 'test');
    expect(() => assertProjectPicked(config)).toThrow(/No project selected/);
    expect(() => assertProjectPicked(mismatched)).toThrow(/carries the profile of "hk-sit"/);

    process.argv.push('--project=hk-sit');
    expect(() => assertProjectPicked(config)).not.toThrow();
  } finally {
    process.argv.splice(0, process.argv.length, ...originalArgv);
  }
});
