export default function serializeIntoHash(store, modelClass, snapshot, options = { includeId: true }) {
  const serializer = store.serializerFor(modelClass.modelName);

  if (typeof serializer.serializeIntoHash === 'function') {
    const data = {};
    serializer.serializeIntoHash(data, type, snapshot, options);
    return data;
  }

  return serializer.serialize(snapshot, options);
}
