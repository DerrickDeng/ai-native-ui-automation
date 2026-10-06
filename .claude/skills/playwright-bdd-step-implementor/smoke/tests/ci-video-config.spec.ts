import { expect, test } from '@playwright/test';
import config from '../../../../../playwright.config';

// Importing the root config needs nothing (no env vars, no files): the guard
// is globalSetup, not the config module (src/config/framework/assertProjectPicked.ts).

test('CI disables video while local runs capture complete video', () => {
  const expectedVideoMode = process.env.CI ? 'off' : 'on';

  expect(config.use?.video).toBe(expectedVideoMode);
  expect(config.use?.screenshot).toBe('on');
  expect(config.use?.trace).toBe(process.env.CI ? 'off' : 'on');
  expect(config.use?.actionTimeout).toBe(10_000);
  expect(config.use?.navigationTimeout).toBe(30_000);
});

test('maximized Chrome uses the native window without device emulation', () => {
  for (const project of config.projects ?? []) {
    expect(project.use?.viewport).toBeNull();
    expect(project.use?.deviceScaleFactor).toBeUndefined();
    expect(project.use?.launchOptions?.args).toContain('--start-maximized');
  }
});
