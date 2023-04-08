import { dasherize } from '@ember/string';

export default function normalizeModelName(modelName: string): string {
  return dasherize(modelName);
}
