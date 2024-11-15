import { dasherize } from '@ember-data/request-utils/string';

export function normalizeModelName(type: string): string {
  return dasherize(type);
}
