import type { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import { dasherize } from '@ember/string';

export function isMaybeIdentifier(
  maybeIdentifier: string | ResourceIdentifierObject
): maybeIdentifier is ResourceIdentifierObject {
  return Boolean(
    maybeIdentifier !== null &&
      typeof maybeIdentifier === 'object' &&
      (('id' in maybeIdentifier && 'type' in maybeIdentifier && maybeIdentifier.id && maybeIdentifier.type) ||
        maybeIdentifier.lid)
  );
}

export function normalizeModelName(type: string): string {
  return dasherize(type);
}
