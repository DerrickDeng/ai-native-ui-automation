import profiles from '../profiles.json';

export const ENVIRONMENTS = ['sit', 'uat'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const REGIONS = ['hk', 'sg', 'tw'] as const;
export type Region = (typeof REGIONS)[number];

// Shared by Playwright project names and profiles.json keys.
export type ProfileName = `${Region}-${Environment}`;

// Runtime counterpart of ProfileName, shared by applicability filtering and
// tag validation. The order follows REGIONS × ENVIRONMENTS.
export const PROFILE_NAMES: readonly ProfileName[] = REGIONS.flatMap((region) =>
  ENVIRONMENTS.map((environment) => `${region}-${environment}` as ProfileName),
);

// Every profile must provide a URL map. URL names may differ between profiles;
// all other top-level fields are free-form and inferred directly from JSON.
type RequiredProfileConfig = {
  urls: Record<string, string>;
};

// Check the minimum contract without erasing JSON-inferred custom fields.
const PROFILE_CONFIGS =
  profiles.profiles satisfies Record<ProfileName, RequiredProfileConfig>;

type ProfileConfigUnion = (typeof PROFILE_CONFIGS)[ProfileName];
type KeysOfUnion<T> = T extends unknown ? keyof T : never;
type ValueOfUnion<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : never
  : never;

// Fields shared by every profile stay required. Fields present in only some
// profiles are optional, but remain discoverable through editor completion.
type MergeUnion<T> = {
  [K in keyof T]: ValueOfUnion<T, K>;
} & {
  [K in Exclude<KeysOfUnion<T>, keyof T>]?: ValueOfUnion<T, K>;
};

type UrlsOf<T> = T extends { urls: infer U } ? U : never;
type WithoutUrls<T> = T extends unknown ? Omit<T, 'urls'> : never;
type InferredCustomConfig = MergeUnion<WithoutUrls<ProfileConfigUnion>>;
type InferredUrls = MergeUnion<UrlsOf<ProfileConfigUnion>>;

// Immutable project option consumed through fixtures, never process.env.
export type TestProfile = Readonly<
  {
    environment: Environment;
    region: Region;
    urls: Readonly<InferredUrls>;
  } & InferredCustomConfig
>;

// Validate at config load. Trailing slashes are rejected because pages append
// paths directly to these values.
for (const [name, config] of Object.entries(PROFILE_CONFIGS)) {
  for (const [key, address] of Object.entries(config.urls)) {
    const where = `${name}.urls.${key} in profiles.json`;
    // new URL() accepts unknown schemes, so allow only HTTP(S).
    let parsed: URL;
    try {
      parsed = new URL(address);
    } catch {
      throw new Error(`${where} is not a valid URL: "${address}"`);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`${where} must be http(s): "${address}"`);
    }
    if (address.endsWith('/')) {
      throw new Error(`${where} must not end with a slash: "${address}"`);
    }
  }
}

export function buildProfile(environment: Environment, region: Region): TestProfile {
  return Object.freeze({ environment, region, ...PROFILE_CONFIGS[`${region}-${environment}`] });
}
