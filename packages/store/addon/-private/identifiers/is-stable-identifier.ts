import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
/**
  @module @ember-data/store
*/

const IDENTIFIERS = new WeakSet();

export default function isStableIdentifier<T extends string>(
  identifier: Object
): identifier is StableRecordIdentifier<T> {
  return IDENTIFIERS.has(identifier);
}

export function markStableIdentifier(identifier: Object) {
  IDENTIFIERS.add(identifier);
}

export function unmarkStableIdentifier(identifier: Object) {
  IDENTIFIERS.delete(identifier);
}
