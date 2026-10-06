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

  async openDefects(): Promise<void> {
    await this.page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Defects' }).click();
  }

  async assertTileVisible(label: string): Promise<void> {
    const tile = this.page.locator('section.card.hero').filter({ has: this.page.getByText(label, { exact: true }) });
    await expect(tile).toBeVisible();
  }
}

Given('I am signed in to the QA dashboard', async function ({ page, profile }) {
  await new DashboardSession(page, profile).signIn();
});

When('I open the Defects section', async function ({ page, profile }) {
  await new DashboardSession(page, profile).openDefects();
});

Then('the {string} tile should be visible', async function ({ page, profile }, label: string) {
  await new DashboardSession(page, profile).assertTileVisible(label);
});
