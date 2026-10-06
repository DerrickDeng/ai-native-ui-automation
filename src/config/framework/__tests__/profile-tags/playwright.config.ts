import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { applicabilityExpression } from '../../applicability';
import {
  ENVIRONMENTS,
  REGIONS,
  type Environment,
  type Region,
} from '../../profile';
import { lintFeatureTags } from '../../tagLint';

const root = path.resolve('src/config/framework/__tests__/profile-tags');
const features = path.join(root, 'features/**/*.feature');

lintFeatureTags(path.join(root, 'features'));

function project(region: Region, environment: Environment) {
  const name = `${region}-${environment}`;
  return {
    name,
    testDir: defineBddConfig({
      features,
      steps: path.join(root, 'steps/**/*.ts'),
      outputDir: path.join(root, `.features-gen/${name}`),
      tags: applicabilityExpression(region, environment),
      missingSteps: 'fail-on-gen' as const,
    }),
  };
}

export default defineConfig({
  reporter: 'line',
  projects: REGIONS.flatMap((region) =>
    ENVIRONMENTS.map((environment) => project(region, environment)),
  ),
});
