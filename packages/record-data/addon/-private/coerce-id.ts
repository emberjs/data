import { DEBUG } from '@glimmer/env';

// Used by the store to normalize IDs entering the store.  Despite the fact
// that developers may provide IDs as numbers (e.g., `store.findRecord('person', 1)`),
// it is important that internally we use strings, since IDs may be serialized
// and lose type information.  For example, Ember's router may put a record's
// ID into the URL, and if we later try to deserialize that URL and find the
// corresponding record, we will not know if it is a string or a number.
type Coercable = string | number | boolean | null | undefined | symbol;

function coerceId(id: Coercable): string | null {
  if (id === null || id === undefined || id === '') {
    return null;
  }
  if (typeof id === 'string') {
    return id;
  }
  if (typeof id === 'symbol') {
    return id.toString();
  }
  return '' + id;
}

export function ensureStringId(id: Coercable): string {
  let normalized: string | null = null;
  if (typeof id === 'string') {
    normalized = id.length > 0 ? id : null;
  } else if (typeof id === 'number' && !isNaN(id)) {
    normalized = '' + id;
  }

  if (DEBUG && normalized === null) {
    throw new Error(`Expected id to be a string or number, received ${String(id)}`);
  }

  return normalized!;
}

export default coerceId;
