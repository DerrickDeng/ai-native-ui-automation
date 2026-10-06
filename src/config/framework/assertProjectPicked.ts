import type { FullConfig } from '@playwright/test';
import type { TestProfile } from './profile';

// Guards project/profile alignment and prevents CLI runs from executing every
// region×environment project accidentally. MCP, VS Code and UI mode select
// projects outside the normal CLI path.
export default function assertProjectPicked(config: FullConfig): void {
  for (const project of config.projects) {
    const profile = (project.use as { profile?: TestProfile }).profile;
    const named = `${profile?.region}-${profile?.environment}`;
    if (profile && project.name !== named) {
      throw new Error(
        `Project "${project.name}" carries the profile of "${named}" — ` +
          'the name and buildProfile() arguments disagree (playwright.config.ts).',
      );
    }
  }

  const argv = process.argv;
  const isCliTestRun = argv[2] === 'test';
  const picked = argv.some((a) => a.startsWith('--project')) || argv.includes('--ui');
  if (isCliTestRun && !picked) {
    throw new Error(
      [
        'No project selected. Pick the region+environment combo(s) explicitly:',
        '  npm test -- --project=hk-sit',
        `Available: ${config.projects.map((p) => p.name).join(', ')}`,
      ].join('\n'),
    );
  }
}
