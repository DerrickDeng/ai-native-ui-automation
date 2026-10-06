import { defineConfig } from '@playwright/test';

// Harness config for the skill smoke suite. The tests here do not open a
// browser themselves — they drive `bddgen` / `playwright test` as child
// processes inside disposable copies of fixture-project/.
export default defineConfig({
  testDir: './tests',
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
});
