import { assert } from '@ember/debug';

import type { Snapshot } from 'ember-data/-private';

import type Store from '@ember-data/store';
import type ShimModelClass from '@ember-data/store/-private/system/model/shim-model-class';
import type { DSModelSchema } from '@ember-data/store/-private/ts-interfaces/ds-model';
import type { MinimumSerializerInterface } from '@ember-data/store/-private/ts-interfaces/minimum-serializer-interface';
import { DefaultRegistry } from '@ember-data/types';
import { RecordType } from '@ember-data/types/utils';

type SerializerWithSerializeIntoHash<R extends DefaultRegistry> = MinimumSerializerInterface<R> & {
  serializeIntoHash?<T extends RecordType<R>>(
    hash: {},
    modelClass: ShimModelClass<R, T>,
    snapshot: Snapshot<R, T>,
    options?: { includeId?: boolean }
  ): void;
};

export default function serializeIntoHash<R extends DefaultRegistry, T extends RecordType<R> = RecordType<R>>(
  store: Store<R>,
  modelClass: ShimModelClass<R, T> | DSModelSchema<R, T>,
  snapshot: Snapshot<R, T>,
  options: { includeId?: boolean } = { includeId: true }
) {
  const serializer: SerializerWithSerializeIntoHash<R> | null = store.serializerFor(modelClass.modelName);

  assert(`Cannot serialize record, no serializer defined`, serializer);

  if (typeof serializer.serializeIntoHash === 'function') {
    const data = {};
    serializer.serializeIntoHash(data, modelClass, snapshot, options);
    return data;
  }

  return serializer.serialize(snapshot, options);
}
