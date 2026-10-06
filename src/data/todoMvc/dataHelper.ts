export function getNestedData<T>(data: Record<string, Record<string, unknown>>, region: string, fieldName: string): T {
  if (!(region in data)) {
    throw new Error(`Region "${region}" not found`);
  }
  const regionData = data[region];
  if (!(fieldName in regionData)) {
    throw new Error(`Field "${fieldName}" not found in region "${region}"`);
  }
  return regionData[fieldName] as T;
}

export function getNestedDataWithEnv<T>(data: Record<string, Record<string, Record<string, unknown>>>, region: string, env: string, code: string): T {
  if (!(region in data)) {
    throw new Error(`Region "${region}" not found`);
  }
  if (!(env in data[region])) {
    throw new Error(`Environment "${env}" not found in region "${region}"`);
  }
  const entry = data[region][env][code];
  if (!entry) {
    throw new Error(`No entry for code "${code}" in env "${env}", region "${region}"`);
  }
  return entry as T;
}
