import { expect, type Page } from '@playwright/test';

export class PageContext {
  // Page Objects in one Scenario share this active-page reference.
  constructor(public current: Page) {}
}

export abstract class BasePage {
  protected constructor(protected readonly pageContext: PageContext) {}

  protected get page(): Page {
    return this.pageContext.current;
  }

  protected async goto(baseUrl: string | undefined, path: string): Promise<void> {
    if (!baseUrl) {
      throw new Error(`Base URL is undefined for path "${path}". Is the URL set for this profile in src/config/profiles.json?`);
    }

    await this.page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  }

  async assertUrlContains(urlPart: string): Promise<void> {
    await expect(this.page).toHaveURL((url) => url.pathname.includes(urlPart));
  }
}
