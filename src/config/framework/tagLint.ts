import fs from 'node:fs';
import path from 'node:path';
import { PROFILE_TAGS } from './applicability';
import { FEATURES_ROOT } from './paths';
import { ENVIRONMENTS, REGIONS } from './profile';

const VALID_PROFILE_TAGS = new Set(PROFILE_TAGS);
const LEGACY_DIMENSION_VALUES = [...REGIONS, ...ENVIRONMENTS].join('|');
const LEGACY_DIMENSION_TAGS = new Set([...REGIONS, ...ENVIRONMENTS].map((value) => `@${value}`));
// Applicability-like names are reserved so typos cannot silently become
// ordinary grep tags. Other names such as @smoke and @ticket-123 are allowed.
const LOOKS_LIKE_RESERVED_TAG = new RegExp(
  `^@(?:${LEGACY_DIMENSION_VALUES})(?:$|[^a-z])|[^a-z](?:${ENVIRONMENTS.join('|')})$`,
  'i',
);

type Violation = { where: string; message: string };

function checkTag(tag: string, where: string, violations: Violation[]): void {
  const lower = tag.toLowerCase();
  if (VALID_PROFILE_TAGS.has(tag)) return;

  if (VALID_PROFILE_TAGS.has(lower)) {
    violations.push({ where, message: `${tag} — tags are lowercase, use ${lower}` });
    return;
  }

  if (!LOOKS_LIKE_RESERVED_TAG.test(tag)) return;

  if (LEGACY_DIMENSION_TAGS.has(lower)) {
    violations.push({
      where,
      message: `${tag} — dimension tags are not supported; use exact profile tags such as @hk-sit`,
    });
    return;
  }

  violations.push({
    where,
    message: `${tag} — invalid profile tag; use one of ${PROFILE_TAGS.join(' ')}`,
  });
}

export function lintFeatureTags(featuresDir = FEATURES_ROOT): void {
  const root = path.resolve(featuresDir);
  const files = fs
    .readdirSync(root, { recursive: true, encoding: 'utf-8' })
    .filter((f) => f.endsWith('.feature'))
    .map((f) => path.join(root, f))
    .sort();

  const violations: Violation[] = [];
  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('@')) return;
      const where = `${relative}:${index + 1}`;
      for (const token of trimmed.split(/\s+/)) {
        if (token.startsWith('#')) break;
        checkTag(token, where, violations);
      }
    });
  }

  if (violations.length > 0) {
    throw new Error(
      ['Feature tag lint failed:', ...violations.map((v) => `  ${v.where}  ${v.message}`)].join(
        '\n',
      ),
    );
  }
}
