import Store from '@ember-data/store';
export const StoreTypesMap = new WeakMap();

// override _createRecordData to add the known models to the typesMap
const __createRecordData = Store.prototype._createRecordData;
Store.prototype._createRecordData = function(identifier) {
  if (!StoreTypesMap.has(this)) {
    StoreTypesMap.set(this, new Map());
  }
  const typesMap = StoreTypesMap.get(this);
  if (!typesMap.has(identifier.type)) {
      typesMap.set(identifier.type, false);
    }
    return __createRecordData.call(this, identifier);
};

export default {
  name: '@ember-data/data-adapter',
  initialize() {},
};
