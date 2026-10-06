import { spawnSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import * as path from 'node:path';

const SMOKE_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(SMOKE_DIR, 'fixture-project');
export const RUNS_DIR = path.join(SMOKE_DIR, '.runs');

export interface CmdResult {
  status: number;
  output: string;
}

/**
 * Copy fixture-project/ to a disposable run directory. The copy stays inside
 * the repo so node module resolution keeps finding the root node_modules.
 */
export function prepareRun(name: string): string {
  const dir = path.join(RUNS_DIR, name);
  rmSync(dir, { recursive: true, force: true });
  cpSync(TEMPLATE_DIR, dir, { recursive: true });
  return dir;
}

export function runCmd(dir: string, args: string[]): CmdResult {
  // This harness itself runs inside Playwright Test; the inherited PW_* /
  // PLAYWRIGHT* / TEST_* vars confuse the child bddgen ("no BDD configs
  // found") and playwright runs. Strip them before spawning.
  const cleanEnv: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(cleanEnv)) {
    if (/^(PLAYWRIGHT|PW_|TEST_|FORCE_COLOR)/.test(key) || key === 'BDD_STEP_IMPLEMENTATION') {
      delete cleanEnv[key];
    }
  }
  const result = spawnSync('npx', args, {
    cwd: dir,
    encoding: 'utf8',
    env: cleanEnv,
    timeout: 180_000,
  });
  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

export function bddgen(dir: string): CmdResult {
  return runCmd(dir, ['bddgen']);
}

// A project is mandatory on real runs (assertProjectPicked guard), so the
// harness supplies the default combo unless the caller picked one; use
// pwTestRaw to run with exactly the given args (e.g. to test the guard).
export function pwTest(dir: string, extraArgs: string[] = []): CmdResult {
  const args = extraArgs.some((a) => a.startsWith('--project')) ? extraArgs : ['--project=hk-sit', ...extraArgs];
  return pwTestRaw(dir, args);
}

export function pwTestRaw(dir: string, extraArgs: string[] = []): CmdResult {
  return runCmd(dir, ['playwright', 'test', '--workers=1', ...extraArgs]);
}

// Combo/applicability behavior has its own focused S13 run. Other smoke cases
// exclude those scenarios to keep their output and timing stable.
export const GREEN_ARGS = ['--grep-invert', '@env'];
