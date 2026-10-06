import * as fs from 'node:fs';
import * as path from 'node:path';
import { createBdd, test as base } from 'playwright-bdd';
import { type TestProfile } from '../config/profile';
import { FixtureAppPage } from '../pages/FixtureAppPage';

type Fixtures = {
  fixtureAppPage: FixtureAppPage;
  ctx: Record<string, unknown>;
  journal: string;
};

type WorkerFixtures = {
  profile: TestProfile;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  // The frozen combo parameters, injected per project in playwright.config.ts
  // (use.profile) — mirror of the main project's profile fixture.
  profile: [
    undefined as unknown as TestProfile,
    { scope: 'worker', option: true },
  ],
  // Scenario-scoped scratch state shared between steps. A fresh object per
  // scenario — isolation comes for free.
  ctx: async ({}, use) => {
    await use({});
  },
  fixtureAppPage: async ({ page }, use) => {
    await use(new FixtureAppPage(page));
  },
  // Setup/teardown demo fixture: appends markers around the scenario. Lazy —
  // only scenarios that consume this fixture produce journal lines.
  journal: async ({}, use) => {
    const file = path.resolve('.journal.log');
    fs.appendFileSync(file, 'setup\n');
    await use(file);
    fs.appendFileSync(file, 'teardown\n');
  },
});

export const { Given, When, Then } = createBdd(test);
