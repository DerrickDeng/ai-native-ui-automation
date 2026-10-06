import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { applicabilityExpression } from './src/config/applicability';
import {
  buildProfile,
  type Environment,
  type Region,
  type TestProfile,
} from './src/config/profile';

const chrome = { ...devices['Desktop Chrome'], channel: 'chrome' } as const;

// The fixture app is a local static page; its URL depends on where this
// project copy lives, so it is computed here instead of being stored in .env.
process.env.APP_URL = pathToFileURL(path.join(__dirname, 'app/index.html')).href;

function project(region: Region, environment: Environment) {
  const name = `${region}-${environment}`;
  return {
    name,
    testDir: defineBddConfig({
      features: 'src/features/**/*.feature',
      steps: ['src/fixtures/bddTest.ts', 'src/steps/**/*.ts'],
      outputDir: `tests/.features-gen/${name}`,
      tags: applicabilityExpression(region, environment),
      missingSteps: 'fail-on-gen',
    }),
    use: { ...chrome, profile: buildProfile(environment, region) },
  };
}

export default defineConfig<object, { profile: TestProfile }>({
  // Project guard: only real CLI runs must pick a project (see
  // assertProjectPicked.ts); loading the config needs nothing.
  globalSetup: './src/config/assertProjectPicked.ts',
  timeout: 20_000,
  expect: {
    timeout: 3_000,
  },
  fullyParallel: false,
  workers: 1,
  outputDir: 'test-results',
  reporter: [['list']],
  use: {
    headless: true,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  // Two values per dimension are enough to prove generation-time filtering.
  projects: [
    project('hk', 'sit'),
    project('sg', 'sit'),
    project('hk', 'uat'),
    project('sg', 'uat'),
  ],
});
