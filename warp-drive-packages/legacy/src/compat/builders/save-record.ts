import { recordIdentifierFor, storeFor, type StoreRequestInput } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import { assertPrivateStore, type InstanceCache } from '@warp-drive/core/store/-private';
import type { ResourceKey } from '@warp-drive/core/types';
import type { Cache } from '@warp-drive/core/types/cache';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import { SkipCache } from '@warp-drive/core/types/request';
import type { RequestSignature } from '@warp-drive/core/types/symbols';

type SaveRecordRequestInput<T extends string = string, RT = unknown> = StoreRequestInput & {
  op: 'createRecord' | 'deleteRecord' | 'updateRecord';
  data: {
    record: ResourceKey<T>;
    options: SaveRecordBuilderOptions;
  };
  records: [ResourceKey<T>];
  [RequestSignature]?: RT;
};

type SaveRecordBuilderOptions = Record<string, unknown>;

function _resourceIsFullDeleted(identifier: ResourceKey, cache: Cache): boolean {
  return cache.isDeletionCommitted(identifier) || (cache.isNew(identifier) && cache.isDeleted(identifier));
}

function resourceIsFullyDeleted(instanceCache: InstanceCache, identifier: ResourceKey): boolean {
  const cache = instanceCache.cache;
  return !cache || _resourceIsFullDeleted(identifier, cache);
}

/**
  This function builds a request config for saving the given record (e.g. creating, updating, or deleting the record).
  When passed to `store.request`, this config will result in the same behavior as a legacy `store.saveRecord` request.
  Additionally, it takes the same options as `store.saveRecord`.

  All `@ember-data/legacy-compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
  This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
  To that end, these builders are deprecated and will be removed in a future version of Ember Data.

  @deprecated
  @public
  @param {Object} record a record to save
  @param {SaveRecordBuilderOptions} options optional, may include `adapterOptions` hash which will be passed to adapter.saveRecord
  @return {SaveRecordRequestInput} request config
*/
export function saveRecordBuilder<T extends TypedRecordInstance>(
  record: T,
  options: Record<string, unknown> = {}
): SaveRecordRequestInput<TypeFromInstance<T>, T> {
  const store = storeFor(record, true);
  assertPrivateStore(store);
  assert(`Unable to initiate save for a record in a disconnected state`, store);
  const identifier = recordIdentifierFor<T>(record);

  if (!identifier) {
    // this commonly means we're disconnected
    // but just in case we throw here to prevent bad things.
    throw new Error(`Record Is Disconnected`);
  }
  assert(
    `Cannot initiate a save request for an unloaded record: ${identifier.lid}`,
    store._instanceCache.recordIsLoaded(identifier)
  );

  if (resourceIsFullyDeleted(store._instanceCache, identifier)) {
    throw new Error('cannot build saveRecord request for deleted record');
  }

  if (!options) {
    options = {};
  }
  let operation: 'createRecord' | 'deleteRecord' | 'updateRecord' = 'updateRecord';

  const cache = store.cache;
  if (cache.isNew(identifier)) {
    operation = 'createRecord';
  } else if (cache.isDeleted(identifier)) {
    operation = 'deleteRecord';
  }

  return {
    op: operation,
    data: {
      options,
      record: identifier,
    },
    records: [identifier],
    cacheOptions: { [SkipCache]: true },
  };
}
