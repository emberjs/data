export function serializerForAdapter(store, adapter, modelName) {
  let serializer = adapter.serializer;

  if (serializer === undefined) {
    serializer = store.serializerFor(modelName);
  }

  if (serializer === null || serializer === undefined) {
    serializer = {
      extract(store, type, payload) { return payload; }
    };
  }

  return serializer;
}
