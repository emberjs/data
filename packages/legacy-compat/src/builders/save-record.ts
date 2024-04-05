import { assert } from '@ember/debug';

import { recordIdentifierFor, storeFor, type StoreRequestInput } from '@ember-data/store';
import type { InstanceCache } from '@ember-data/store/-private/caches/instance-cache';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import { SkipCache } from '@warp-drive/core-types/request';

export type SaveRecordRequestInput = StoreRequestInput & {
  op: 'createRecord' | 'deleteRecord' | 'updateRecord';
  data: {
    record: StableRecordIdentifier;
    options: SaveRecordBuilderOptions;
  };
  records: [StableRecordIdentifier];
};

export type SaveRecordBuilderOptions = Record<string, unknown>;

function _resourceIsFullDeleted(identifier: StableRecordIdentifier, cache: Cache): boolean {
  return cache.isDeletionCommitted(identifier) || (cache.isNew(identifier) && cache.isDeleted(identifier));
}

function resourceIsFullyDeleted(instanceCache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const cache = instanceCache.cache;
  return !cache || _resourceIsFullDeleted(identifier, cache);
}

/**
 * FIXME: Docs
  This function builds a request config for the given type.
  When passed to `store.request`, this config will result in the same behavior as a `store.findAll` request.
  Additionally, it takes the same options as `store.findAll`.

  @since x.x.x
  @method query
  @public
  @param {String} type the name of the resource
  @param {object} query a query to be used by the adapter
  @param {SaveRecordBuilderOptions} options optional, may include `adapterOptions` hash which will be passed to adapter.query
  @return {SaveRecordRequestInput} request config
*/
export function saveRecordBuilder<T>(record: T, options: Record<string, unknown> = {}): SaveRecordRequestInput {
  const store = storeFor(record);
  assert(`Unable to initiate save for a record in a disconnected state`, store);
  const identifier = recordIdentifierFor(record);

  if (!identifier) {
    // this commonly means we're disconnected
    // but just in case we throw here to prevent bad things.
    throw new Error(`Record Is Disconnected`);
  }
  // TODO we used to check if the record was destroyed here
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
    cacheOptions: { [SkipCache as symbol]: true },
  };
}

/*

TODO:
* [] cargo cult jsdoc setup from json-api/src/-private/builders/query.ts

*/
