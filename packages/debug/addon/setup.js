
// dirty hack to add the known models to the typesMap
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

// EmberData 4.7+
Object.defineProperty(Store.prototype, '_instanceCache', {
  get() {
    return this.__instanceCache;
  },
  set(value) {
    const getRecordData = value.getRecordData;
    const store = this;
    value.getRecordData = function(identifier) {
      const typesMap = typesMapFor(store);
      if (!typesMap.has(identifier.type)) {
        typesMap.set(identifier.type, false);
      }
      return getRecordData.call(this, identifier);
    }
    this.__instanceCache = value;
  }
});

// EmberData <= 4.6
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
