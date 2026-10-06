import type { FullConfig } from '@playwright/test';
import type { TestProfile } from './profile';

// Mirrors the main project's src/config/framework/assertProjectPicked.ts: a CLI
// `playwright test` run must pick a project; loading the config through bddgen,
// --list, or IDE discovery needs nothing. The selection is only
// visible in argv — config.projects always lists all projects, which is what
// makes it the right source for the "Available:" list.
export default function assertProjectPicked(config: FullConfig): void {
  // Mirror of the main guard's first check: a project's name must match the
  // profile it carries.
  for (const project of config.projects) {
    const profile = (project.use as { profile?: TestProfile }).profile;
    const named = `${profile?.region}-${profile?.environment}`;
    if (profile && project.name !== named) {
      throw new Error(`Project "${project.name}" carries the profile of "${named}".`);
    }
  }

  const argv = process.argv;
  const isCliTestRun = argv[2] === 'test';
  const picked = argv.some((a) => a.startsWith('--project')) || argv.includes('--ui');
  if (isCliTestRun && !picked) {
    throw new Error(
      [
        'No project selected. Pick the combo explicitly:',
        '  npx playwright test --project=hk-sit',
        `Available: ${config.projects.map((p) => p.name).join(', ')}`,
      ].join('\n'),
    );
  }
}
