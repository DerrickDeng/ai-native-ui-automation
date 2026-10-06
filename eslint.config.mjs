import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'tests/.features-gen/',
      'src/config/framework/__tests__/profile-tags/.features-gen/',
      'reports/',
      'test-results/',
      '.claude/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The skill smoke fixture ships its own eslint.config.mjs (used by the
    // lint-guard smoke test); pin the root dir so tseslint doesn't see two
    // candidate TSConfigRootDirs.
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['src/**/*.ts'],
  },
  {
    files: ['src/steps/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              message: 'Step files must not import Playwright browser/assertion APIs. Move browser logic to src/pages and inject a typed fixture.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/^(Given|When|Then|Step)$/] > ArrowFunctionExpression',
          message: 'Step callbacks use async function (...) {}. Keep Playwright fixtures as the first parameter.',
        },
        {
          selector: 'CallExpression[callee.name=/^(Given|When|Then|Step)$/] > FunctionExpression ThisExpression',
          message: 'Playwright-style steps must not use this/ScenarioWorld; inject fixtures in the first parameter.',
        },
        {
          selector: "CallExpression[callee.name=/^(Given|When|Then|Step)$/] > FunctionExpression > ObjectPattern > Property[key.name='page']",
          message: 'Step callbacks must inject Page Object fixtures, not the raw page fixture. Move browser logic to src/pages.',
        },
      ],
    },
  },
);
