import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_NON_STRICT_ID } from '@warp-drive/build-config/deprecations';

// Used by the store to normalize IDs entering the store.  Despite the fact
// that developers may provide IDs as numbers (e.g., `store.findRecord('person', 1)`),
// it is important that internally we use strings, since IDs may be serialized
// and lose type information.  For example, Ember's router may put a record's
// ID into the URL, and if we later try to deserialize that URL and find the
// corresponding record, we will not know if it is a string or a number.
type Coercable = string | number | boolean | null | undefined | symbol;

export function coerceId(id: Coercable): string | null {
  if (DEPRECATE_NON_STRICT_ID) {
    let normalized: string | null;
    if (id === null || id === undefined || id === '') {
      normalized = null;
    } else {
      normalized = String(id);
    }

    deprecate(
      `The resource id '<${typeof id}> ${String(
        id
      )} ' is not normalized. Update your application code to use '${JSON.stringify(normalized)}' instead.`,
      normalized === id,
      {
        id: 'ember-data:deprecate-non-strict-id',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '5.3',
          enabled: '5.3',
        },
      }
    );

    return normalized;
  }

  assert(
    `Resource IDs must be a non-empty string or null. Received '${String(id)}'.`,
    id === null || (typeof id === 'string' && id.length > 0)
  );

  return id;
}

export function ensureStringId(id: Coercable): string {
  let normalized: string | null = null;
  if (typeof id === 'string') {
    normalized = id.length > 0 ? id : null;
  } else if (typeof id === 'number' && !isNaN(id)) {
    normalized = String(id);
  }

  assert(`Expected id to be a string or number, received ${String(id)}`, normalized !== null);

  return normalized;
}
