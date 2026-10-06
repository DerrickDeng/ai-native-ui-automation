import { expect, type Page } from '@playwright/test';

export class FixtureAppPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    const url = process.env.APP_URL;
    if (!url) {
      throw new Error('APP_URL is not set (it is computed in playwright.config.ts)');
    }
    await this.page.goto(url);
  }

  async clickReveal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Reveal' }).click();
  }

  async assertSecretText(expected: string): Promise<void> {
    await expect(this.page.getByTestId('secret')).toHaveText(expected);
  }

  async switchTab(tabName: string): Promise<void> {
    await this.page.getByRole('button', { name: tabName, exact: true }).click();
  }

  async assertActiveTab(tabName: string): Promise<void> {
    await expect(this.page.getByTestId('active-tab')).toHaveText(tabName);
  }

  async pageTitle(): Promise<string> {
    return this.page.title();
  }

  async assertTitleEquals(expected: string): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }
}
