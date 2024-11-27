import { deprecate } from '@ember/debug';

import { dasherize } from '@ember-data/request-utils/string';
import { DEPRECATE_NON_STRICT_TYPES, DISABLE_6X_DEPRECATIONS } from '@warp-drive/build-config/deprecations';
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
  if (DEPRECATE_NON_STRICT_TYPES) {
    const result = dasherize(type);

    deprecate(
      `The resource type '${type}' is not normalized. Update your application code to use '${result}' instead of '${type}'.`,
      /* inline-macro-config */ DISABLE_6X_DEPRECATIONS ? true : result === type,
      {
        id: 'ember-data:deprecate-non-strict-types',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '4.13',
          enabled: '5.3',
        },
      }
    );

    return result;
  }

  return type;
}
