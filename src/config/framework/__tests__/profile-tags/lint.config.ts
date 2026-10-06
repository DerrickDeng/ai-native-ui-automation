import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { lintFeatureTags } from '../../tagLint';

const root = path.resolve('src/config/framework/__tests__/profile-tags');
const featuresDir = process.env.TAG_LINT_FEATURES ?? path.join(root, 'features');
lintFeatureTags(featuresDir);

export default defineConfig({
  testDir: root,
  testMatch: /no-tests-expected/,
});
