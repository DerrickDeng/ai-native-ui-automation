import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { TestProfile } from '../../../../../src/config/framework/profile';
import { PageContext } from '../../../../../src/pages/BasePage';
import { TodoFooter } from '../../../../../src/pages/todoMvc/TodoFooter';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const PAGES_DIR = path.join(REPO_ROOT, 'src/pages');
const FIXTURES_FILE = path.join(REPO_ROOT, 'src/fixtures/bddTest.ts');

function typescriptFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(target);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [target] : [];
  });
}

function fixtureNameFor(className: string): string {
  return className.replace(/^[A-Z]+(?=[A-Z][a-z]|$)/, (acronym) => acronym.toLowerCase()).replace(/^[A-Z]/, (initial) => initial.toLowerCase());
}

test('A0: Page Object fixture names use lower camel case for acronyms', () => {
  expect(fixtureNameFor('QADashboardPage')).toBe('qaDashboardPage');
  expect(fixtureNameFor('URLPage')).toBe('urlPage');
  expect(fixtureNameFor('TodoFooter')).toBe('todoFooter');
});

test('A1: every concrete Page Object extends BasePage and is a typed fixture', () => {
  const fixtures = readFileSync(FIXTURES_FILE, 'utf8');
  const pageFiles = typescriptFiles(PAGES_DIR).filter((file) => path.basename(file) !== 'BasePage.ts');
  expect(pageFiles.length).toBeGreaterThan(0);

  for (const file of pageFiles) {
    const source = readFileSync(file, 'utf8');
    const classMatch = source.match(/export class ([A-Za-z][A-Za-z0-9_]*)/);
    expect(classMatch, `${path.relative(REPO_ROOT, file)} must export one Page Object class`).not.toBeNull();

    const className = classMatch![1];
    const fixtureName = fixtureNameFor(className);
    expect(source, `${className} must extend BasePage`).toContain(`export class ${className} extends BasePage`);
    expect(source, `${className} constructor must accept shared PageContext`).toContain('pageContext: PageContext');
    expect(source, `${className} constructor must accept TestProfile`).toContain('profile: TestProfile');
    expect(source, `${className} must initialize BasePage`).toContain('super(pageContext)');
    expect(fixtures, `${className} must be declared as a typed fixture`).toContain(`${fixtureName}: ${className}`);
    expect(fixtures, `${className} must be constructed by the fixture layer`).toContain(`new ${className}(`);
  }
});

test('A2: existing Page Objects follow the shared active page', async () => {
  const clicks: string[] = [];
  const makePage = (name: string) =>
    ({
      getByRole: () => ({ click: async () => clicks.push(name) }),
      getByTestId: () => ({ click: async () => clicks.push(name) }),
    }) as unknown as Page;

  const pageContext = new PageContext(makePage('main'));
  const profile = {} as TestProfile;
  const footer = new TodoFooter(pageContext, profile);

  await footer.showFilter('Active');
  pageContext.current = makePage('popup');
  await footer.clearCompleted();
  await footer.showFilter('All');

  expect(clicks).toEqual(['main', 'popup', 'popup']);
});
