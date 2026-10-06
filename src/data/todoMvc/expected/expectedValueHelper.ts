import type { Region } from '../../../config/framework/profile';
import { getNestedData } from '../dataHelper';
import todoText from './todoText.json';

export function getExpectedValue(region: Region, fieldName: string): string {
  return getNestedData<string>(todoText, region, fieldName);
}
