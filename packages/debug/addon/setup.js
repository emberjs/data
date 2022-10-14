
// dirty hack to add the known models to the typesMap
import Store from '@ember-data/store';

const StoreTypesMap = new WeakMap();

export function typesMapFor(store) {
  let typesMap = StoreTypesMap.get(store);

  if (typesMap === undefined) {
    typesMap = new Map();
    StoreTypesMap.set(store, typesMap);
    installHook(store, typesMap);
  }

  return typesMap;
}

// EmberData 4.7+
function installHook(store, typesMap) {
  const getRecordData = store._instanceCache.getRecordData;
  store._instanceCache.getRecordData = function(identifier) {
    if (!typesMap.has(identifier.type)) {
      typesMap.set(identifier.type, false);
    }
    return getRecordData.call(this, identifier);
  }
}

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
