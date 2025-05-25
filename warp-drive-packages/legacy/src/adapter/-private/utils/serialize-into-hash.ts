import type { Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import type { ModelSchema } from '@warp-drive/core/types';

import type { MinimumSerializerInterface, SerializerOptions } from '../../../compat.ts';
import { type Snapshot, upgradeStore } from '../../../compat/-private.ts';

type SerializerWithSerializeIntoHash = MinimumSerializerInterface & {
  serializeIntoHash?(hash: object, modelClass: ModelSchema, snapshot: Snapshot, options?: SerializerOptions): void;
};

export function serializeIntoHash(
  store: Store,
  modelClass: ModelSchema,
  snapshot: Snapshot,
  options: { includeId?: boolean } = { includeId: true }
) {
  upgradeStore(store);
  const serializer: SerializerWithSerializeIntoHash | null = store.serializerFor(modelClass.modelName);

  assert(`Cannot serialize record, no serializer defined`, serializer);

  if (typeof serializer.serializeIntoHash === 'function') {
    const data = {};
    serializer.serializeIntoHash(data, modelClass, snapshot, options);
    return data;
  }

  return serializer.serialize(snapshot, options);
}
