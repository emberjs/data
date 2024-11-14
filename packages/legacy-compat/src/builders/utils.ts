import { dasherize } from '@ember-data/request-utils/string';
import type { ResourceIdentifierObject } from '@warp-drive/core-types/spec/json-api-raw';

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
