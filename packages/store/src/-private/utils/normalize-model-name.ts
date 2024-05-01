import { deprecate } from '@ember/debug';
import { dasherize } from '@ember/string';

import { DEPRECATE_NON_STRICT_TYPES } from '@warp-drive/build-config/deprecations';

export default function normalizeModelName(type: string): string {
  if (DEPRECATE_NON_STRICT_TYPES) {
    const result = dasherize(type);

    deprecate(
      `The resource type '${type}' is not normalized. Update your application code to use '${result}' instead of '${type}'.`,
      result === type,
      {
        id: 'ember-data:deprecate-non-strict-types',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '5.3',
          enabled: '5.3',
        },
      }
    );

    return result;
  }

  return type;
}
