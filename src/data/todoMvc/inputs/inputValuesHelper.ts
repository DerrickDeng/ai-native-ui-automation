import type { Environment, Region } from '../../../config/framework/profile';
import { getNestedDataWithEnv } from '../dataHelper';
import inputValues from './inputValues.json';

export function getInputValue(region: Region, env: Environment, code: string): string {
  return getNestedDataWithEnv<string>(inputValues, region, env, code);
}
