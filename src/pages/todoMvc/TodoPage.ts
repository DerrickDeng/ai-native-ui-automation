import { expect, type Locator } from '@playwright/test';
import type { TestProfile } from '../../config/framework/profile';
import { BasePage, type PageContext } from '../BasePage';
import { getExpectedValue } from '../../data/todoMvc/expected/expectedValueHelper';
import { getInputValue } from '../../data/todoMvc/inputs/inputValuesHelper';

const locators = {
  /* test-id */
  todoItem: 'todo-item',
  todoCount: 'todo-count',

  /* text values */
  newTodoInput: 'What needs to be done?',
  toggleTodo: 'Toggle Todo',

  /* selectors - fallback only */
} as const;

export class TodoPage extends BasePage {
  constructor(
    pageContext: PageContext,
    private readonly profile: TestProfile,
  ) {
    super(pageContext);
  }

  async open(): Promise<void> {
    await this.goto(this.profile.urls.todoMvc, '');
  }

  async addTodo(todoCode: string): Promise<void> {
    const input = this.page.getByPlaceholder(locators.newTodoInput);
    await input.fill(this.todoTitle(todoCode));
    await input.press('Enter');
  }

  async completeTodo(todoCode: string): Promise<void> {
    await this.todoItem(this.todoTitle(todoCode)).getByRole('checkbox', { name: locators.toggleTodo }).check();
  }

  async assertTodosShown(todoCodes: string[]): Promise<void> {
    const titles = todoCodes.map((todoCode) => this.todoTitle(todoCode));
    await expect(this.page.getByTestId(locators.todoItem)).toHaveText(titles);
  }

  async assertRemainingCount(counterCode: string): Promise<void> {
    const counterText = getExpectedValue(this.profile.region, counterCode);
    await expect(this.page.getByTestId(locators.todoCount)).toHaveText(counterText);
  }

  private todoTitle(todoCode: string): string {
    return getInputValue(this.profile.region, this.profile.environment, todoCode);
  }

  private todoItem(title: string): Locator {
    return this.page.getByTestId(locators.todoItem).filter({ hasText: title });
  }
}
