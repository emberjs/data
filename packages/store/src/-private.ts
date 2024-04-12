/**
  @module @ember-data/store
*/

export { default as Store, storeFor } from './-private/store-service';

export { recordIdentifierFor } from './-private/caches/instance-cache';

export { CacheHandler, type LifetimesService } from './-private/cache-handler';

export { isStableIdentifier } from './-private/caches/identifier-cache';

export { default as constructResource } from './-private/utils/construct-resource';

// TODO this should be a deprecated helper but we have so much usage of it
// to also eliminate
export { default as coerceId, ensureStringId } from './-private/utils/coerce-id';
export type { NativeProxy } from './-private/record-arrays/native-proxy-type-fix';
export {
  default as RecordArray,
  default as IdentifierArray,
  Collection as AdapterPopulatedRecordArray,
  notifyArray,
  SOURCE,
  MUTATE,
  ARRAY_SIGNAL,
} from './-private/record-arrays/identifier-array';
export { default as RecordArrayManager, fastPush } from './-private/managers/record-array-manager';

// leaked for private use / test use, should investigate removing
export { _clearCaches } from './-private/caches/instance-cache';
export { default as peekCache, removeRecordDataFor } from './-private/caches/cache-utils';

// @ember-data/model needs these temporarily
export { setRecordIdentifier, StoreMap } from './-private/caches/instance-cache';
export { setCacheFor } from './-private/caches/cache-utils';
export { default as _deprecatingNormalize } from './-private/utils/normalize-model-name';
export type { StoreRequestInput } from './-private/cache-handler';
