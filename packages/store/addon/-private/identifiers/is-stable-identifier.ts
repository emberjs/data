type StableRecordIdentifier = import('../ts-interfaces/identifier').StableRecordIdentifier;
/**
  @module @ember-data/store
*/

const IDENTIFIERS = new WeakMap();

export default function isStableIdentifier(identifier: Object): identifier is StableRecordIdentifier {
  return IDENTIFIERS.has(identifier);
}

export function markStableIdentifier(identifier: Object) {
  IDENTIFIERS.set(identifier, 'is-identifier');
}

export function unmarkStableIdentifier(identifier: Object) {
  IDENTIFIERS.delete(identifier);
}
