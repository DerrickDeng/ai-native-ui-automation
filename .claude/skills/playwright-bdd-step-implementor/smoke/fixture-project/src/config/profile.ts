import profiles from './profiles.json';

export const ENVIRONMENTS = ['sit', 'uat'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const REGIONS = ['hk', 'sg'] as const;
export type Region = (typeof REGIONS)[number];

// Shared by Playwright project names and profiles.json keys (mirrors the main
// project's ProfileName).
export type ProfileName = `${Region}-${Environment}`;

// Runtime counterpart of ProfileName, consumed by the applicability
// expression. The order follows REGIONS × ENVIRONMENTS.
export const PROFILE_NAMES: readonly ProfileName[] = REGIONS.flatMap((region) =>
  ENVIRONMENTS.map((environment) => `${region}-${environment}` as ProfileName),
);

// Minimal mirror of the main project's profile (decision 12): values live in
// profiles.json, one row per combo; this type is the field list, and the
// assignment below makes the compiler check the JSON against it.
type ComboConfig = {
  greeting: string;
};

const BY_COMBO: Record<ProfileName, ComboConfig> = profiles.combos;

export type TestProfile = Readonly<{
  environment: Environment;
  region: Region;
}> &
  Readonly<ComboConfig>;

export function buildProfile(environment: Environment, region: Region): TestProfile {
  return Object.freeze({ environment, region, ...BY_COMBO[`${region}-${environment}`] });
}
