import { createBdd, test as base } from 'playwright-bdd';
import { type TestProfile } from '../config/framework/profile';
import { PageContext } from '../pages/BasePage';
import { TodoFooter } from '../pages/todoMvc/TodoFooter';
import { TodoPage } from '../pages/todoMvc/TodoPage';
import { createDevelopmentPause, type DevelopmentPause } from './developmentPause';

type ScenarioContext = {
  rememberedUrl?: string;
};

type PageFixtures = {
  pageContext: PageContext;
  developmentPause: DevelopmentPause;
  todoFooter: TodoFooter;
  todoPage: TodoPage;
  ctx: ScenarioContext;
};

type WorkerFixtures = {
  profile: TestProfile;
};

const captureStepScreenshots = process.env.STEP_SCREENSHOTS === '1';

export const test = base.extend<PageFixtures, WorkerFixtures>({
  // Worker-scoped project option containing the selected profile and URLs.
  profile: [undefined as unknown as TestProfile, { scope: 'worker', option: true }],
  // One active-page reference shared by Page Objects in this scenario.
  pageContext: async ({ page }, use) => {
    await use(new PageContext(page));
  },
  // Scenario state shared between steps.
  ctx: async ({}, use) => {
    await use({});
  },
  developmentPause: async ({ pageContext }, use) => {
    await use(createDevelopmentPause(() => pageContext.current));
  },
  todoFooter: async ({ pageContext, profile }, use) => {
    await use(new TodoFooter(pageContext, profile));
  },
  todoPage: async ({ pageContext, profile }, use) => {
    await use(new TodoPage(pageContext, profile));
  },
});

export const { Given, When, Then, AfterStep } = createBdd(test);

// Optional per-step evidence; failure-only artifacts remain the default.
AfterStep(async function ({ pageContext, $bddContext, $testInfo }) {
  if (!captureStepScreenshots) {
    return;
  }

  const stepNumber = String($bddContext.stepIndex + 1).padStart(2, '0');
  const attachmentName = `Step ${stepNumber}: ${$bddContext.step.title}`;

  try {
    const page = pageContext.current;
    await page.waitForLoadState('load');
    const screenshot = await page.screenshot({ animations: 'disabled' });

    await $testInfo.attach(attachmentName, {
      body: screenshot,
      contentType: 'image/png',
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
    console.warn(`[AfterStep] Screenshot skipped: ${attachmentName}: ${reason}`);
  }
});
