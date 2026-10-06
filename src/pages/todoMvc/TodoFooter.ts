import type { TestProfile } from '../../config/framework/profile';
import { BasePage, type PageContext } from '../BasePage';

const locators = {
  /* test-id */

  /* text values */
  clearCompletedButton: 'Clear completed',

  /* selectors - fallback only */
} as const;

export class TodoFooter extends BasePage {
  constructor(
    pageContext: PageContext,
    private readonly profile: TestProfile,
  ) {
    super(pageContext);
  }

  async showFilter(filterName: string): Promise<void> {
    await this.page.getByRole('link', { name: filterName }).click();
  }

  async clearCompleted(): Promise<void> {
    await this.page.getByRole('button', { name: locators.clearCompletedButton }).click();
  }
}
