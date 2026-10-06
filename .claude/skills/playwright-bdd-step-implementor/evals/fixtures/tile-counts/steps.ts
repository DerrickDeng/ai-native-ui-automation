import { expect, type Page } from '@playwright/test';
import { type TestProfile } from '../../config/framework/profile';
import { decrypt } from '../../utils/encryption';
import { Given, Then, When } from '../../fixtures/bddTest';

const EVAL_ACCOUNT = { username: 'eval-bot', password: '126a2e511e71af94967773a0:2c38b8574b2ee556440f356c2da258d1:cdaade33a7b19bf2fc1ad88efa401b34d467ed757a9fe9e0' };

class DashboardSession {
  constructor(
    private readonly page: Page,
    private readonly profile: TestProfile,
  ) {}

  async signIn(): Promise<void> {
    await this.page.goto(this.profile.urls.qaDashboard);
    await this.page.getByLabel('Username').fill(EVAL_ACCOUNT.username);
    await this.page.getByLabel('Password', { exact: true }).fill(decrypt(EVAL_ACCOUNT.password));
    await this.page.getByRole('button', { name: 'Sign in' }).click();
    await expect(this.page.getByRole('heading', { name: 'QA Dashboard' })).toBeVisible();
  }

  async assertTileShowsCount(position: number): Promise<void> {
    await expect(this.page.locator('.stat-value').nth(position)).toHaveText(/^\d[\d,]*$/);
  }
}

Given('I am signed in to the QA dashboard', async function ({ page, profile }) {
  await new DashboardSession(page, profile).signIn();
});

Then('the Failed tile should show a count', async function ({ page, profile }) {
  await new DashboardSession(page, profile).assertTileShowsCount(1);
});

Then('the Flaky tile should show a count', async function ({ page, profile }) {
  await new DashboardSession(page, profile).assertTileShowsCount(2);
});
