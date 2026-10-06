import { expect, test } from '@playwright/test';
import { bddgen, prepareRun, pwTest, pwTestRaw } from './helpers';

// SKILL.md "Combo selection": the COMMAND picks the region×environment combo
// via --project (decision 12); each project carries a frozen profile from a
// typed TS table — no env files, no process.env. The guard is globalSetup,
// so it fires only on a real CLI run — loading the config through bddgen,
// --list, or IDE discovery needs nothing at all.

test('S13: generation keeps only scenarios applicable to the selected combo', () => {
  const dir = prepareRun('s13-env');
  expect(bddgen(dir).status).toBe(0);

  const sitList = pwTestRaw(dir, ['--list', '--project=hk-sit', '--grep', '@env']);
  expect(sitList.status).toBe(0);
  expect(sitList.output).toContain('SIT combo greeting');
  expect(sitList.output).not.toContain('UAT combo greeting');
  expect(sitList.output).toContain('HK-only combo marker');
  expect(sitList.output).not.toContain('SG-only combo marker');
  expect(sitList.output).not.toContain('Pending automation is excluded');

  const uatList = pwTestRaw(dir, ['--list', '--project=hk-uat', '--grep', '@env']);
  expect(uatList.status).toBe(0);
  expect(uatList.output).toContain('UAT combo greeting');
  expect(uatList.output).not.toContain('SIT combo greeting');
  expect(uatList.output).toContain('HK-only combo marker');
  expect(uatList.output).not.toContain('SG-only combo marker');
  expect(uatList.output).not.toContain('Pending automation is excluded');

  // Profile tags are an allowlist: @hk-sit @sg-sit puts the SIT greeting in
  // both regions' SIT combos.
  const sgSitList = pwTestRaw(dir, ['--list', '--project=sg-sit', '--grep', '@env']);
  expect(sgSitList.status).toBe(0);
  expect(sgSitList.output).toContain('SIT combo greeting');
  expect(sgSitList.output).not.toContain('UAT combo greeting');
  expect(sgSitList.output).toContain('SG-only combo marker');
  expect(sgSitList.output).not.toContain('HK-only combo marker');

  // No profile tag means the scenario is generated for every combo.
  for (const combo of ['hk-sit', 'sg-uat']) {
    const universal = pwTestRaw(dir, ['--list', `--project=${combo}`, '--grep', 'Reveal the secret content']);
    expect(universal.status).toBe(0);
    expect(universal.output).toContain('Reveal the secret content');
  }

  // Each project receives the matching frozen profile, so both valid runs pass.
  expect(bddgen(dir).status).toBe(0);
  const sitRun = pwTest(dir, ['--project=hk-sit', '--grep', '@env']);
  expect(sitRun.status).toBe(0);
  expect(bddgen(dir).status).toBe(0);
  const uatRun = pwTest(dir, ['--project=hk-uat', '--grep', '@env']);
  expect(uatRun.status).toBe(0);
});

test('S13b: the project guard fires on a real CLI run, not on config load', () => {
  const dir = prepareRun('s13b-env-guard');

  // Config load needs nothing: bddgen generates every combo-specific output
  // directory in one pass, so the guard must not require a selected project.
  expect(bddgen(dir).status).toBe(0);

  // Listing is pure introspection: no project, no error. IDE discovery uses
  // the same config-loading path.
  const listBare = pwTestRaw(dir, ['--list']);
  expect(listBare.status).toBe(0);
  expect(listBare.output).not.toContain('No project selected');

  // A real run without --project dies in globalSetup, before any test
  // executes, and the error lists the available combos.
  expect(bddgen(dir).status).toBe(0);
  const runBare = pwTestRaw(dir);
  expect(runBare.status).not.toBe(0);
  expect(runBare.output).toContain('No project selected');
  expect(runBare.output).toContain('hk-sit');

  // Misspelled project: Playwright itself rejects it with the known names.
  expect(bddgen(dir).status).toBe(0);
  const runTypo = pwTestRaw(dir, ['--project=hk-stt']);
  expect(runTypo.status).not.toBe(0);
  expect(runTypo.output).toContain('hk-stt');
});
