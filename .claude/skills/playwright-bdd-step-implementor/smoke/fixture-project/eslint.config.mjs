import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

// Mirrors the main project's eslint setup so the lint-guard smoke test
// exercises the same playwright/no-standalone-expect enforcement.
export default tseslint.config(
  {
    ignores: ['tests/.features-gen/', 'test-results/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
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
