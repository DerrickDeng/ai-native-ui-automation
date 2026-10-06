import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const IMPLEMENTOR = path.join(REPO_ROOT, '.claude/skills/playwright-bdd-step-implementor/SKILL.md');
const HEALER = path.join(REPO_ROOT, '.claude/skills/playwright-bdd-test-healer/SKILL.md');
const IMPLEMENTOR_DIR = path.dirname(IMPLEMENTOR);
const HEALER_DIR = path.dirname(HEALER);
const BDD_TEST_FIXTURES = path.join(REPO_ROOT, 'src/fixtures/bddTest.ts');
const DEVELOPMENT_PAUSE = path.join(REPO_ROOT, 'src/fixtures/developmentPause.ts');

function readSkill(file: string): string {
  return readFileSync(file, 'utf8');
}

function frontmatterKeys(source: string): string[] {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  expect(match, `${source.slice(0, 80)} must start with YAML frontmatter`).not.toBeNull();
  return match![1]
    .split('\n')
    .filter((line) => /^[a-z][a-z0-9_-]*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(':')))
    .sort();
}

function expectMarkersInOrder(source: string, markers: string[]): void {
  let previous = -1;

  for (const marker of markers) {
    const current = source.indexOf(marker);
    expect(current, `missing marker: ${marker}`).toBeGreaterThanOrEqual(0);
    expect(current, `${marker} must appear after the previous marker`).toBeGreaterThan(previous);
    previous = current;
  }
}

function expectPatternsInOrder(source: string, patterns: RegExp[]): void {
  let previous = -1;

  for (const pattern of patterns) {
    const current = source.search(pattern);
    expect(current, `missing lifecycle category: ${pattern}`).toBeGreaterThanOrEqual(0);
    expect(current, `${pattern} must appear after the previous lifecycle category`).toBeGreaterThan(previous);
    previous = current;
  }
}

type MarkdownSection = {
  heading: string;
  body: string;
};

function markdownLinesOutsideFences(source: string): string[] {
  const lines = source.split('\n');
  let activeFence: { marker: '`' | '~'; length: number } | undefined;

  return lines.map((line) => {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (!fence) return activeFence ? '' : line;

    const marker = fence[1][0] as '`' | '~';
    if (!activeFence) {
      activeFence = { marker, length: fence[1].length };
    } else if (marker === activeFence.marker && fence[1].length >= activeFence.length && /^\s*$/.test(line.slice(fence[0].length))) {
      activeFence = undefined;
    }
    return '';
  });
}

function markdownSections(source: string, level: number): MarkdownSection[] {
  const lines = markdownLinesOutsideFences(source);
  const headings: Array<{ level: number; heading: string; line: number }> = [];

  for (const [line, value] of lines.entries()) {
    const match = value.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match) headings.push({ level: match[1].length, heading: match[2].replace(/\s+#+$/, ''), line });
  }

  return headings
    .filter((heading) => heading.level === level)
    .map((heading) => {
      const next = headings.find((candidate) => candidate.line > heading.line && candidate.level <= level);
      return {
        heading: heading.heading,
        body: lines.slice(heading.line + 1, next?.line ?? lines.length).join('\n'),
      };
    });
}

function markdownSection(source: string, level: number, heading: string): string {
  const section = markdownSections(source, level).find((candidate) => candidate.heading === heading);
  expect(section, `missing level-${level} heading: ${heading}`).toBeDefined();
  return section!.body;
}

function markdownLinkTargets(source: string): string[] {
  const markdown = markdownLinesOutsideFences(source).join('\n');
  return [...markdown.matchAll(/\[[^\]\n]+\]\(([^)\s]+)(?:\s+['"][^)]*['"])?\)/g)].map(([, target]) => target);
}

const REFERENCE_RESPONSIBILITY_HEADINGS = {
  generation: [
    'Generation gate before every new runner invocation',
    'Read generation output',
    'Preserve source boundaries',
    'Select exactly one project',
    'Focused completion',
  ],
  runtime: ['Values shared through `ctx`', 'Runtime-state reload boundary', 'API setup and cleanup', 'Scenario isolation'],
  debug: [
    'Classify the exceptional outcome',
    'Evidence escalation',
    'Retry discipline',
    'CLI debug session stalls or closes',
    'Resume and stop conditions',
  ],
  revisit: ['Scope gate', 'Establish the runtime pause', 'Make the smallest supported change', 'Focused regression check'],
} as const;

type ReferenceResponsibility = keyof typeof REFERENCE_RESPONSIBILITY_HEADINGS;

function expectSingularReferenceResponsibilities(source: string, responsibility: ReferenceResponsibility): void {
  const headings = markdownSections(source, 2).map(({ heading }) => heading);
  const required = REFERENCE_RESPONSIBILITY_HEADINGS[responsibility];
  const otherOwned = Object.entries(REFERENCE_RESPONSIBILITY_HEADINGS)
    .filter(([owner]) => owner !== responsibility)
    .flatMap(([, owned]) => owned);
  const misplacedCoreHeadings = ['Scenario Outline'];
  const misplacedRevisitHeadings = responsibility === 'revisit' ? [] : ['Revisit', 'Revisit a finished step', 'Revisit a completed step'];

  for (const heading of required) expect(headings, `missing ${responsibility} responsibility heading: ${heading}`).toContain(heading);
  for (const heading of [...otherOwned, ...misplacedCoreHeadings, ...misplacedRevisitHeadings]) {
    expect(headings, `misplaced responsibility heading in ${responsibility}: ${heading}`).not.toContain(heading);
  }
}

test('Q1: both skills stay concise and expose only supported frontmatter', () => {
  expect(frontmatterKeys(readSkill(IMPLEMENTOR))).toEqual(['description', 'metadata', 'name']);
  expect(frontmatterKeys(readSkill(HEALER))).toEqual(['description', 'name']);

  for (const file of [IMPLEMENTOR, HEALER]) expect(readSkill(file).split('\n').length).toBeLessThan(500);
});

test('Q2: both skills pin project scope and protect source specifications', () => {
  for (const file of [IMPLEMENTOR, HEALER]) {
    const source = readSkill(file);
    expect(source).toContain('--project=<region>-<env>');
    expect(source).toContain('tests/.features-gen/**');
    expect(source).toContain('src/features/');
    expect(source).toContain('CodeRules.md');
  }
});

test('Q3: implementor uses guarded resumable checkpoints and caps blind retries', () => {
  const source = readSkill(IMPLEMENTOR);
  const cliDebug = readSkill(path.join(IMPLEMENTOR_DIR, 'references/cli-debug-session.md'));
  const frameworkFixtures = readFileSync(BDD_TEST_FIXTURES, 'utf8');
  const developmentPause = readFileSync(DEVELOPMENT_PAUSE, 'utf8');
  expect(source).toContain("await developmentPause.at('open-site-search')");
  expect(cliDebug).toContain('npx bddgen');
  expect(cliDebug).toContain('BDD_STEP_IMPLEMENTATION=1 npx playwright test');
  expect(cliDebug).toContain('The explicit `page.pause()` checkpoint is the control point');
  expect(cliDebug).toContain('Keep the framework fixture');
  expect(cliDebug).toContain('Do not count an exploration run as validation');
  // Ref commands beyond click and fill exist; the full list lives in Playwright CLI's own skill.
  expect(cliDebug).toContain('](../../playwright-cli/SKILL.md)');
  expect(existsSync(path.join(IMPLEMENTOR_DIR, '../playwright-cli/SKILL.md'))).toBe(true);
  expect(frameworkFixtures).toContain('developmentPause: DevelopmentPause');
  expect(frameworkFixtures).toContain('await use(createDevelopmentPause(() => pageContext.current))');
  expect(developmentPause).toContain("process.env.BDD_STEP_IMPLEMENTATION !== '1'");
  expect(developmentPause).toContain('TODO remains: ${label}');
  expect(developmentPause).toContain('await getPage().pause()');
  expect(source).toContain('6 attempts per step');
  expect(source).toContain('Playwright CLI `snapshot`');
  expect(source).toContain('Steps delegate, POs assert');
});

test('Q4: healer takes evidence from the failed run first and stops a live run only when needed', () => {
  const source = readSkill(HEALER);
  expect(source).toContain('classify by error shape');
  expect(source).toContain('snapshot + DOM query + screenshot');
  expect(source).toContain('Never edit');
  expect(source).toContain('test.fixme()');
  expect(source).toContain('Steps delegate, POs assert');
  expect(source).toContain('error-context.md');
  // The trace already holds the page before and after every action; a served
  // snapshot answers most questions without a new run or a manual sign-in.
  expect(source).toContain('npx playwright trace snapshot <number> --name after --serve');
  expect(source).toContain("Start at the failing action's `after` snapshot.");
  // Trace command details live in Playwright's own skill, installed with
  // `npx playwright trace install-skill`; the healer links to it.
  expect(source).toContain('](../playwright-trace/SKILL.md)');
  expect(existsSync(path.join(REPO_ROOT, '.claude/skills/playwright-trace/SKILL.md'))).toBe(true);
  // Playwright CLI command forms and its --debug=cli flow come from the CLI's own
  // skill, installed with `playwright-cli install --skills`.
  expect(source).toContain('](../playwright-cli/SKILL.md)');
  expect(source).toContain('](../playwright-cli/references/playwright-tests.md)');
  for (const file of ['SKILL.md', 'references/playwright-tests.md']) {
    expect(existsSync(path.join(REPO_ROOT, '.claude/skills/playwright-cli', file))).toBe(true);
  }
  // The implementor's CLI session doc says not to use pause-at; the healer must not send agents there.
  expect(source).not.toContain('cli-debug-session.md');
  expect(source).toContain('never sign in by hand');
  expect(source).toContain('playwright-cli list');
  // --debug=cli pauses only at test start, never on failure; pause-at to the
  // reported line is what stops the run before the failing call.
  expect(source).toContain('--debug=cli');
  expect(source).toContain('pause-at src/pages/');
  expect(source).toContain('`pause-at` stops only on a line that makes a browser call');
  expect(source).toContain('pkill -f "playwright test"');
  // The MCP route was retired; neither its tools nor its agent may come back.
  expect(source).not.toMatch(/test_run|test_debug|playwright-test-healer/);
});

test('Q5: skill interface metadata remains discoverable and namespaced', () => {
  const interfaces = [
    [path.join(IMPLEMENTOR_DIR, 'agents/openai.yaml'), '$playwright-bdd-step-implementor'],
    [path.join(HEALER_DIR, 'agents/openai.yaml'), '$playwright-bdd-test-healer'],
  ] as const;

  for (const [file, invocation] of interfaces) {
    const source = readSkill(file);
    expect(source).toContain('display_name:');
    expect(source).toContain('short_description:');
    expect(source).toContain('default_prompt:');
    expect(source).toContain(invocation);
  }
});

test('Q6: every judgment eval has a complete local fixture', () => {
  const evalsFile = path.join(IMPLEMENTOR_DIR, 'evals/evals.json');
  const definitions = JSON.parse(readSkill(evalsFile)) as {
    evals: Array<{ name: string; prompt: string; expectations: string[] }>;
  };

  expect(definitions.evals.map(({ name }) => name)).toEqual([
    'defect-tiles',
    'defect-escape-rate',
    'filter-narrowing',
    'section-tour',
    'run-report-build',
    'run-filters',
    'tile-counts',
    'pass-rate-check',
    'failing-not-flaky',
  ]);

  for (const definition of definitions.evals) {
    const fixtureDir = path.join(IMPLEMENTOR_DIR, 'evals/fixtures', definition.name);
    expect(existsSync(path.join(fixtureDir, 'scenario.feature'))).toBe(true);
    expect(existsSync(path.join(fixtureDir, 'steps.ts'))).toBe(true);
    expect(definition.prompt).toContain('project hk-sit');
    expect(definition.expectations.length).toBeGreaterThanOrEqual(4);
  }
});

test('Q7: every healer judgment eval has a complete local fixture and is project-scoped', () => {
  const evalsFile = path.join(HEALER_DIR, 'evals/evals.json');
  const definitions = JSON.parse(readSkill(evalsFile)) as {
    evals: Array<{ name: string; prompt: string; expectations: string[] }>;
  };

  expect(definitions.evals.map(({ name }) => name)).toEqual(['run-report', 'defect-summary', 'escape-rate', 'project-pass-rate']);

  for (const definition of definitions.evals) {
    expect(definition.prompt).toContain('project hk-sit');
    expect(definition.expectations.length).toBeGreaterThanOrEqual(5);

    const fixtureDir = path.join(HEALER_DIR, 'evals/fixtures', definition.name);
    for (const file of ['scenario.feature', 'steps.ts']) {
      expect(existsSync(path.join(fixtureDir, file))).toBe(true);
    }
  }
});

test('Q8: implementor validates only the target and reports affected callers for handoff', () => {
  const implementor = readSkill(IMPLEMENTOR);
  expect(implementor).toContain('--grep');
  expect(markdownSection(implementor, 2, 'Non-Negotiables')).toContain(
    'do not run those callers or the whole project unless the user explicitly requests it',
  );
  expect(markdownSection(implementor, 2, 'Output Contract & Quality Gates')).toContain('marking those Scenarios as not run');

  const healer = readSkill(HEALER);
  expect(healer).toContain('--grep');
  expect(healer).toMatch(/do not run the entire selected project/i);
});

test('Q9: both skills state the full Page Object contract, not just "move it out of steps"', () => {
  for (const file of [IMPLEMENTOR, HEALER]) {
    const source = readSkill(file);
    expect(source).toContain('A class declared in `src/steps` is not a compliant Page Object');
    expect(source).toContain('extends `BasePage`');
    expect(source).toContain('constructor(pageContext: PageContext, private readonly profile: TestProfile)');
    expect(source).toContain('typed fixture in `src/fixtures/bddTest.ts`');
  }
});

// Renames are how a skill silently goes stale: `chore: move features under src` and
// `refactor: split demo into named systems` both broke paths no tool was watching.
// Only concrete filenames are checked — globs (`src/steps/**/*.ts`) and templates
// (`src/steps/<system>/<pageObject>.steps.ts`) contain characters this pattern excludes.
test('Q10: every concrete file path the skills cite still exists', () => {
  const concretePath = /^[\w./-]+\.(ts|json|md|mjs|feature)$/;
  for (const file of [IMPLEMENTOR, HEALER]) {
    const skill = path.basename(path.dirname(file));
    const cited = new Set([...readSkill(file).matchAll(/`([^`\n]+)`/g)].map(([, value]) => value).filter((value) => concretePath.test(value)));

    // Guard against the pattern silently matching nothing after a rewrite.
    expect(cited.size, `${skill} cites no concrete file path`).toBeGreaterThan(0);

    for (const citation of cited) {
      expect(existsSync(path.join(REPO_ROOT, citation)), `${skill} cites a missing path: ${citation}`).toBe(true);
    }
  }
});

test('Q11: implementor continues through existing steps and restarts only for Node-side state', () => {
  const source = readSkill(IMPLEMENTOR);
  const runtime = readSkill(path.join(IMPLEMENTOR_DIR, 'references/runtime-state-and-fixtures.md'));
  const debug = readSkill(path.join(IMPLEMENTOR_DIR, 'references/debug-evidence-and-recovery.md'));

  expect(source).toContain('An existing step is not a replay boundary');
  expect(source).toContain('resume so the runner executes it in the same Scenario');
  expect(source).toContain('A saved TODO that must populate runner-owned state is a Node-side reload boundary');
  expect(runtime).toContain(
    'If an already implemented producer ran earlier in the current session, its value is already valid and no restart is needed',
  );
  expect(runtime).toContain(
    '[end the active session](cli-debug-session.md#end-the-session), pass the generation gate, and restart the focused Scenario',
  );
  const endSession = markdownSection(readSkill(path.join(IMPLEMENTOR_DIR, 'references/cli-debug-session.md')), 2, 'End the session');
  expect(endSession).toContain('`pkill` is the only way to end the runner');
  expect(endSession).toContain('Never end a session with `resume`');
  expect(source).toContain('.slice(0, 80)');
  expect(source).toContain('locator candidate');

  expect(source).not.toContain('A later existing step is a replay boundary');
  expect(source).not.toContain('Replay one continuous TODO block');
  expect(source).not.toContain('replay is cheap');
  expect(source).not.toContain('gives a canonical locator');
  expect(debug).not.toContain('.slice(0, 80)');
  expect(debug).not.toContain('locator candidate');
});

test('Q12: implementor exposes the complete primary lifecycle in execution order', () => {
  const source = readSkill(IMPLEMENTOR);
  const levelTwoHeadings = markdownSections(source, 2).map(({ heading }) => heading);

  expectMarkersInOrder(levelTwoHeadings.join('\n'), [
    'Input & Evidence Contract',
    'Non-Negotiables',
    'Workflow & Routing',
    'Output Contract & Quality Gates',
    'Boundaries & Stop Conditions',
    'References',
  ]);

  const workflow = markdownSection(source, 2, 'Workflow & Routing');
  const entryHeadings = markdownSections(workflow, 3).map(({ heading }) => heading);
  expect(entryHeadings).toEqual(expect.arrayContaining(['Missing or TODO steps', 'Revisit a completed step']));
  expect(entryHeadings.indexOf('Additional rules for specific scenarios')).toBe(entryHeadings.indexOf('Core lifecycle') + 1);
  expect(entryHeadings.indexOf('Discover and bind')).toBe(entryHeadings.indexOf('Additional rules for specific scenarios') + 1);

  expectPatternsInOrder(workflow, [
    /discover[\s\S]{0,80}bind/i,
    /check[\s\S]{0,100}additional rules[\s\S]{0,100}follow every rule/i,
    /^3\. Pass the \[generation gate\]\([^\n)]+\), then start one focused `--debug=cli` runner(?: \([^\n]+\))?, attach Playwright CLI, and confirm the actual checkpoint\.$/im,
    /classify[\s\S]{0,80}(?:outcome|result)/i,
    /explore[\s\S]{0,100}current TODO[\s\S]{0,100}save[\s\S]{0,80}implementation/i,
    /resume[\s\S]{0,100}same runner[\s\S]{0,100}existing steps/i,
    /restart only[\s\S]{0,100}saved change[\s\S]{0,100}remaining Scenario/i,
    /^8\. Repeat steps 4–7[\s\S]{0,180}observe the debug runner's outcome\.$/im,
    /^9\. Remove development checkpoints[^\n]*validate only the target[^\n]*affected direct callers highlighted as not run/im,
  ]);
  expect(workflow).not.toMatch(/(?:bypass|do not pass)[^\n]{0,80}generation gate/i);

  const additionalRules = markdownSection(workflow, 3, 'Additional rules for specific scenarios');
  expect(markdownLinkTargets(workflow)).toContain('#additional-rules-for-specific-scenarios');
  expect(additionalRules).toMatch(/check which rules below apply[\s\S]{0,100}follow all of them/i);
  expect(additionalRules).toContain('Multiple rules may apply');

  const routing = markdownSection(workflow, 3, 'Runtime outcome routing');
  expect(routing).toMatch(/next TODO after resume[\s\S]{0,120}(?:confirm|confirmation)[\s\S]{0,40}checkpoint/i);
  expect(routing).not.toMatch(/next TODO after resume[\s\S]{0,120}(?:guidance matching|additional rule selection)/i);
  expect(levelTwoHeadings).not.toContain('Choose the workflow');
});

test('Q13: implementor references separate phase-specific guidance', () => {
  const cliDebug = 'references/cli-debug-session.md';
  const references = {
    generation: 'references/bddgen-and-project-selection.md',
    runtime: 'references/runtime-state-and-fixtures.md',
    debug: 'references/debug-evidence-and-recovery.md',
    revisit: 'references/revisit-finished-step.md',
  } as const;

  for (const relativePath of Object.values(references)) {
    expect(existsSync(path.join(IMPLEMENTOR_DIR, relativePath))).toBe(true);
  }
  expect(existsSync(path.join(IMPLEMENTOR_DIR, cliDebug))).toBe(true);

  for (const [responsibility, relativePath] of Object.entries(references) as Array<[ReferenceResponsibility, string]>) {
    expectSingularReferenceResponsibilities(readSkill(path.join(IMPLEMENTOR_DIR, relativePath)), responsibility);
  }
});

test('Q14: implementor routes each phase directly to its authoritative reference', () => {
  const source = readSkill(IMPLEMENTOR);
  expect(
    markdownLinkTargets(
      [
        '[active](active.md)',
        '```md',
        '[fenced](fenced.md)',
        '```not-a-close',
        '[still-fenced](still-fenced.md)',
        '```',
        '~~~md',
        '~~~not-a-close',
        '[still-tilde-fenced](still-tilde-fenced.md)',
        '~~~\t',
        '[active-after-fences](after.md)',
      ].join('\n'),
    ),
  ).toEqual(['active.md', 'after.md']);
  const workflow = markdownSection(source, 2, 'Workflow & Routing');
  const revisit = markdownSection(workflow, 3, 'Revisit a completed step');
  const additionalRules = markdownSection(workflow, 3, 'Additional rules for specific scenarios');
  const runtimeState = markdownSection(additionalRules, 4, 'Runtime state and fixtures');
  const discoverAndBind = markdownSection(workflow, 3, 'Discover and bind');

  expect(markdownLinkTargets(markdownSection(source, 2, 'Non-Negotiables'))).toContain(
    'references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation',
  );
  expect(markdownLinkTargets(runtimeState)).toContain('references/runtime-state-and-fixtures.md');
  expect(markdownLinkTargets(discoverAndBind)).toContain('references/cli-debug-session.md');
  expect(markdownLinkTargets(discoverAndBind)).toContain(
    'references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation',
  );
  expect(markdownLinkTargets(markdownSection(workflow, 3, 'Runtime outcome routing'))).toContain('references/debug-evidence-and-recovery.md');
  expect(markdownLinkTargets(revisit)).toContain('references/revisit-finished-step.md');

  const activeLinks = markdownLinkTargets(source);
  expect(activeLinks).not.toContain('references/bddgen-project-selection.md');
  expect(activeLinks).not.toContain('references/runtime-state-and-scenario-variants.md');
  expect(activeLinks).not.toContain('references/debug-troubleshooting.md');
});

test('Q15: every skill-directed runner start passes the generation gate', () => {
  const generation = readSkill(path.join(IMPLEMENTOR_DIR, 'references/bddgen-and-project-selection.md'));
  const debug = readSkill(path.join(IMPLEMENTOR_DIR, 'references/debug-evidence-and-recovery.md'));
  const revisit = readSkill(path.join(IMPLEMENTOR_DIR, 'references/revisit-finished-step.md'));
  const coreGateAnchor = 'references/bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation';
  const referenceGateAnchor = 'bddgen-and-project-selection.md#generation-gate-before-every-new-runner-invocation';
  const generationGate = markdownSection(generation, 2, 'Generation gate before every new runner invocation');
  const activeLineContaining = (section: string, marker: string): string => {
    const line = markdownLinesOutsideFences(section).find((candidate) => candidate.includes(marker));
    expect(line, `missing active route line: ${marker}`).toBeDefined();
    return line!;
  };

  const successfulGateLine = activeLineContaining(generationGate, 'For Debug, run');
  expect(successfulGateLine).toMatch(
    /For Debug, run[^\n]+bddgen[^\n]+exit 0[^\n]+BDD_STEP_IMPLEMENTATION=1 npx playwright test[^\n]+--debug=cli[^\n]+attach Playwright CLI/i,
  );
  expect(successfulGateLine).toMatch(/final CLI validation[^\n]+bddgen[^\n]+exit 0[^\n]+npx playwright test/i);
  expect(successfulGateLine).toContain('remove every development checkpoint');

  const resumeRule = activeLineContaining(generationGate, 'Resuming an already active Playwright CLI session');
  expect(resumeRule).toContain('is not a new invocation');
  expect(resumeRule).not.toMatch(/run `npx bddgen`|start .*runner/i);

  const failedGateLine = activeLineContaining(generationGate, 'If `bddgen` fails');
  expect(failedGateLine).toMatch(/bddgen[^\n]{0,80}(?:fails|nonzero)[^\n]{0,100}(?:do not|must not|never)[^\n]{0,80}start a runner invocation/i);
  expect(failedGateLine).toMatch(/(?:do not|must not|never)[^\n]{0,80}(?:reuse|trust)[^\n]{0,80}stale generated tests/i);

  const targetBindingRoute = activeLineContaining(generationGate, 'Target missing or ambiguous binding');
  expect(targetBindingRoute).toMatch(/repair[^\n]{0,40}restart the gate/i);
  const unrelatedBindingRoute = activeLineContaining(generationGate, 'Unrelated out-of-scope missing or ambiguous binding');
  expect(unrelatedBindingRoute).toMatch(/stop[^\n]{0,40}report the blocker/i);
  const tagsRoute = activeLineContaining(generationGate, '`bddgen --tags`');
  expect(tagsRoute).toContain('is an applicability override, not a target selector');

  const source = readSkill(IMPLEMENTOR);
  const workflow = markdownSection(source, 2, 'Workflow & Routing');
  const firstDebugRoute = activeLineContaining(workflow, '3. Pass the');
  expect(markdownLinkTargets(firstDebugRoute)).toContain(coreGateAnchor);
  expect(firstDebugRoute).toMatch(
    /start one focused `--debug=cli` runner \(for a \[Scenario Outline\]\(#scenario-outline\), one runner per Examples row\), attach Playwright CLI, and confirm the actual checkpoint/i,
  );
  const finalValidationRoute = activeLineContaining(workflow, '9. Remove development checkpoints');
  expect(markdownLinkTargets(finalValidationRoute)).toContain(coreGateAnchor);

  const continueSection = markdownSection(workflow, 3, 'Explore, implement, and continue');
  const resumeLine = activeLineContaining(continueSection, 'then `resume`');
  expect(resumeLine).toContain('Existing steps execute through the runner');
  expect(markdownLinkTargets(resumeLine)).not.toContain(coreGateAnchor);
  const restartLine = activeLineContaining(continueSection, 'When a Node-side reload boundary is proven');
  expect(markdownLinkTargets(restartLine)).toContain(coreGateAnchor);
  expect(restartLine).toMatch(
    /end the current debug session[^\n]+start one new focused `--debug=cli` runner[^\n]+runner executes the saved producer/i,
  );

  const revisitPause = markdownSection(revisit, 2, 'Establish the runtime pause');
  const baselineRoute = activeLineContaining(revisitPause, 'Before the passing baseline CLI run');
  expect(markdownLinkTargets(baselineRoute)).toContain(referenceGateAnchor);
  const revisitDebugRoute = activeLineContaining(revisitPause, 'After inserting the `REVISIT` checkpoint');
  expect(markdownLinkTargets(revisitDebugRoute)).toContain(referenceGateAnchor);
  expect(revisitDebugRoute).toMatch(/BDD_STEP_IMPLEMENTATION=1 npx playwright test[^\n]+--workers=1 --debug=cli[^\n]+attach Playwright CLI/i);

  const revisitRegression = markdownSection(revisit, 2, 'Focused regression check');
  const finalRegressionRoute = activeLineContaining(revisitRegression, 'After removing the `REVISIT` checkpoint');
  expect(markdownLinkTargets(finalRegressionRoute)).toContain(referenceGateAnchor);
  expect(finalRegressionRoute).toContain('run direct CLI for final target validation');
  expect(finalRegressionRoute).toContain('affected caller Scenarios in the handoff as not run');

  const recovery = markdownSection(debug, 2, 'Resume and stop conditions');
  const repairedBlockerRoute = activeLineContaining(recovery, '| Earlier real blocker repaired');
  expect(markdownLinkTargets(repairedBlockerRoute)).toContain(referenceGateAnchor);
  expect(repairedBlockerRoute).toMatch(/start one new focused `--debug=cli` runner[^\n]+confirm the actual checkpoint/i);
  const infrastructureRoute = activeLineContaining(recovery, '| Infrastructure restored');
  expect(markdownLinkTargets(infrastructureRoute)).toContain(referenceGateAnchor);
  expect(infrastructureRoute).toContain('fresh focused `--debug=cli` runner');

  const generationHeadings = markdownSections(generation, 2).map(({ heading }) => heading);
  expect(generationHeadings).not.toContain('When to run bddgen');
  expect(generation).not.toMatch(/binding-change rule/i);
});

// A live run regressed by hand-writing `getByText('View Latest News', { exact: true })`
// straight off the snapshot — a form no Playwright tool emitted — and broke on strict mode.
// The provenance rule is what prevents that, so pin it in the evidence contract.
test('Q16: implementor sources every locator from tool output, never snapshot text', () => {
  const source = readSkill(IMPLEMENTOR);
  const evidenceContract = markdownSection(source, 2, 'Input & Evidence Contract');

  expect(evidenceContract).toContain('supplies element refs and page structure, never locator text');
  expect(evidenceContract).toContain('`generate-locator`');
  expect(source).toContain('record its generated Playwright code');

  // The test-id query is a repair tool, not an up-front gate: it must stay downstream
  // of a real failure, or the agent goes back to querying the DOM for every element.
  expect(source).toMatch(/Escalate only when a recorded locator actually fails/);
  expect(markdownSection(source, 2, 'Output Contract & Quality Gates')).toMatch(/traces to a Playwright CLI action echo/);
});
