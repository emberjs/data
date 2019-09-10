import { StableRecordIdentifier, IDENTIFIERS } from '../ts-interfaces/identifier';

/**
  @module @ember-data/store
*/

export default function isStableIdentifier(identifier: Object): identifier is StableRecordIdentifier {
  return IDENTIFIERS.has(identifier);
}

export function markStableIdentifier(identifier: Object) {
  IDENTIFIERS.set(identifier, 'is-identifier');
}
