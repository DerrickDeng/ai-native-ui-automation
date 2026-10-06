import type { Page } from '@playwright/test';

export type DevelopmentPause = {
  // `needs` lists values an earlier step stores for this one, keyed by name.
  // An undefined value stops the run: the step that stores it was saved after
  // this runner started, so its new code never ran. Restart, then check again.
  at(label: string, needs?: Record<string, unknown>): Promise<void>;
};

export function createDevelopmentPause(getPage: () => Page): DevelopmentPause {
  // Resolve the page at the checkpoint, after any active-page change.
  return {
    async at(label: string, needs: Record<string, unknown> = {}) {
      if (process.env.BDD_STEP_IMPLEMENTATION !== '1') {
        throw new Error(`TODO remains: ${label}`);
      }
      const missing = Object.keys(needs).filter((name) => needs[name] === undefined);
      if (missing.length > 0) {
        throw new Error(
          `Checkpoint ${label}: ${missing.join(', ')} not stored yet. The step that stores it was saved after this ` +
            'run started, so its new code has not run. End this run and start a new one before writing this step.',
        );
      }
      const values = Object.entries(needs).map(([name, value]) => ` ${name}=${JSON.stringify(value)}`);
      console.log(`TODO_CHECKPOINT ${label}${values.join('')}`);
      // eslint-disable-next-line playwright/no-page-pause -- This fixture is the explicit debug checkpoint.
      await getPage().pause();
    },
  };
}
