import Store from '@ember-data/store';

const StoreTypesMap = new WeakMap();

export function typesMapFor(store) {
  let typesMap = StoreTypesMap.get(store);

  if (typesMap === undefined) {
    typesMap = new Map();
    StoreTypesMap.set(store, typesMap);
  }

  return typesMap;
}

// override _createRecordData to add the known models to the typesMap
const __createRecordData = Store.prototype._createRecordData;
Store.prototype._createRecordData = function (identifier) {
  const typesMap = typesMapFor(this);
  if (!typesMap.has(identifier.type)) {
    typesMap.set(identifier.type, false);
  }
  return __createRecordData.call(this, identifier);
};

export default {
  name: '@ember-data/data-adapter',
  initialize() {},
};
