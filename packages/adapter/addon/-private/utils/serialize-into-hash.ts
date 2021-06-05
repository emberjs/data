type MinimumSerializerInterface =
  import('@ember-data/store/-private/ts-interfaces/minimum-serializer-interface').MinimumSerializerInterface;
type Snapshot = import('ember-data/-private').Snapshot;
type DSModelSchema = import('@ember-data/store/-private/ts-interfaces/ds-model').DSModelSchema;
type ShimModelClass = import('@ember-data/store/-private/system/model/shim-model-class').default;
type Store = import('@ember-data/store/-private/system/core-store').default;

export default function serializeIntoHash(
  store: Store,
  modelClass: ShimModelClass | DSModelSchema,
  snapshot: Snapshot,
  options: { includeId?: boolean } = { includeId: true }
) {
  const serializer: MinimumSerializerInterface & {
    serializeIntoHash?(
      hash: {},
      modelClass: ShimModelClass,
      snapshot: Snapshot,
      options?: { includeId?: boolean }
    ): void;
  } = store.serializerFor(modelClass.modelName);

  if (typeof serializer.serializeIntoHash === 'function') {
    const data = {};
    serializer.serializeIntoHash(data, modelClass, snapshot, options);
    return data;
  }

  return serializer.serialize(snapshot, options);
}
