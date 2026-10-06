import { PROFILE_NAMES, type Environment, type ProfileName, type Region } from './profile';

export const PROFILE_TAGS = PROFILE_NAMES.map((name) => `@${name}`);

// Exact profile tags form an allowlist. Scenarios without a profile tag apply
// everywhere. WIP specifications stay committed but are not generated.
const NO_PROFILE_TAG = PROFILE_TAGS.map((tag) => `not ${tag}`).join(' and ');

export function applicabilityExpression(region: Region, environment: Environment): string {
  const profileName: ProfileName = `${region}-${environment}`;
  return `(@${profileName} or (${NO_PROFILE_TAG})) and not @wip`;
}
