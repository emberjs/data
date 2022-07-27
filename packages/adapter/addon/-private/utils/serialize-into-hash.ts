import { assert } from '@ember/debug';

import type { Snapshot } from 'ember-data/-private';

import type Store from '@ember-data/store';
import type ShimModelClass from '@ember-data/store/-private/legacy-model-support/shim-model-class';
import type { DSModelSchema } from '@ember-data/types/q/ds-model';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';

type SerializerWithSerializeIntoHash = MinimumSerializerInterface & {
  serializeIntoHash?(hash: {}, modelClass: ShimModelClass, snapshot: Snapshot, options?: { includeId?: boolean }): void;
};

export default function serializeIntoHash(
  store: Store,
  modelClass: ShimModelClass | DSModelSchema,
  snapshot: Snapshot,
  options: { includeId?: boolean } = { includeId: true }
) {
  const serializer: SerializerWithSerializeIntoHash | null = store.serializerFor(modelClass.modelName);

  assert(`Cannot serialize record, no serializer defined`, serializer);

  if (typeof serializer.serializeIntoHash === 'function') {
    const data = {};
    serializer.serializeIntoHash(data, modelClass, snapshot, options);
    return data;
  }

  return serializer.serialize(snapshot, options);
}
