export const StoreTypesMap = new WeakMap();

function setupDataAdapter(application) {
  const store = application.lookup('service:store');
  const typesMap = new Map();
  // its possible the app has more than one store, so this works on the 'main' store
  StoreTypesMap.set(store, typesMap);

  const __createRecordData = store._createRecordData;
  // override _createRecordData to add the known models to the typesMap
  store._createRecordData = function(identifier) {
    if (!typesMap.has(identifier.type)) {
      typesMap.set(identifier.type, false);
    }
    return __createRecordData.call(store, identifier);
  };
}

export default {
  name: '@ember-data/data-adapter',
  initialize: setupDataAdapter,
};
