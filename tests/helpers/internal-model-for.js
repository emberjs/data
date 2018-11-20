import { recordIdentifierFor, internalModelsFor as _internalModelsFor } from 'ember-data/-private';

export default function internalModelFor(store, type, id) {
  let identifier = recordIdentifierFor(store, { type, id });
  return store._getOrCreateInternalModelFor(identifier);
}

export function internalModelsFor(store, type) {
  return {
    get 0() {
      return _internalModelsFor(store, type)[0];
    },
    map(cb) {
      return _internalModelsFor(store, type).map(cb);
    },
    filter(cb) {
      return _internalModelsFor(store, type).filter(cb);
    },
    get length() {
      return _internalModelsFor(store, type).length;
    },
  };
}
