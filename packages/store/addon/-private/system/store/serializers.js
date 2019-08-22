/**
  @module @ember-data/store
*/

export function serializerForAdapter(store, adapter, modelName) {
  let serializer = adapter.serializer;

  if (serializer === undefined) {
    serializer = store.serializerFor(modelName);
  }

  return serializer;
}
