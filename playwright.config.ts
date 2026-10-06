import { defineConfig } from '@playwright/test';
import { cucumberReporter, defineBddConfig } from 'playwright-bdd';
import { applicabilityExpression } from './src/config/framework/applicability';
import {
  buildProfile,
  type Environment,
  type Region,
  type TestProfile,
} from './src/config/framework/profile';
import { FEATURES_GLOB } from './src/config/framework/paths';
import { lintFeatureTags } from './src/config/framework/tagLint';

const chrome = {
  channel: 'chrome',
  viewport: null,
  launchOptions: {
    args: ['--start-maximized'] as string[],
  },
} as const;

// Catch the easy applicability-tag mistakes before generating tests.
lintFeatureTags();

// A project says both where to run (profile) and which scenarios belong to
// that region×environment combination (BDD tags expression).
function project(region: Region, environment: Environment) {
  const name = `${region}-${environment}`;
  return {
    name,
    testDir: defineBddConfig({
      features: FEATURES_GLOB,
      steps: ['src/fixtures/bddTest.ts', 'src/steps/**/*.ts'],
      outputDir: `tests/.features-gen/${name}`,
      tags: applicabilityExpression(region, environment),
      missingSteps: 'fail-on-gen',
    }),
    use: { ...chrome, profile: buildProfile(environment, region) },
  };
}

export default defineConfig<object, { profile: TestProfile }>({
  // Fails CLI runs with no project before opening a browser.
  globalSetup: './src/config/framework/assertProjectPicked.ts',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
    cucumberReporter('html', {
      outputFile: 'reports/cucumber/index.html',
      externalAttachments: true,
    }),
    cucumberReporter('json', {
      outputFile: 'reports/cucumber-report.json',
    }),
  ],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    headless: Boolean(process.env.CI),
    screenshot: 'on',
    trace: process.env.CI ? 'off' : 'on',
    video: process.env.CI ? 'off' : 'on',
    ignoreHTTPSErrors: true,
  },
  // Keep all valid combinations visible here. Select one with, for example,
  // `npm test -- --project=hk-sit`.
  projects: [
    project('hk', 'sit'),
    project('hk', 'uat'),
    project('sg', 'sit'),
    project('sg', 'uat'),
    project('tw', 'sit'),
    project('tw', 'uat'),
  ],
});
