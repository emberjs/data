import type Store from '@ember-data/store';
import type { LegacyRelationshipField } from '@warp-drive/core-types/schema/fields';

type Coercable = string | number | boolean | null | undefined | symbol;

export function coerceId(id: Coercable): string | null {
  if (id === null || id === undefined || id === '') {
    return null;
  } else if (typeof id === 'string') {
    return id;
  } else if (typeof id === 'symbol') {
    return id.toString();
  } else {
    return String(id);
  }
}

export function determineConnectionType(
  store: Store,
  knownSide: LegacyRelationshipField
): 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany' | 'oneToNone' | 'manyToNone' {
  const knownKind = knownSide.kind;
  const inverse = knownSide.options?.inverse ? store.schema.fields(knownSide).get(knownSide.options.inverse) : null;

  if (!inverse) {
    return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
  }

  const otherKind = inverse.kind;

  if (otherKind === 'belongsTo') {
    return knownKind === 'belongsTo' ? 'oneToOne' : 'manyToOne';
  } else {
    return knownKind === 'belongsTo' ? 'oneToMany' : 'manyToMany';
  }
}
