/**
  @module @ember-data/store
*/

export { default as Store, storeFor } from './store-service';

export { recordIdentifierFor } from './caches/instance-cache';

export { CacheHandler, type LifetimesService } from './cache-handler';

export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
  isStableIdentifier,
} from './caches/identifier-cache';

// TODO this should be a deprecated helper but we have so much usage of it
// to also eliminate
export { default as coerceId } from './utils/coerce-id';

export {
  default as RecordArray,
  default as IdentifierArray,
  Collection as AdapterPopulatedRecordArray,
  notifyArray,
  SOURCE,
  MUTATE,
  IDENTIFIER_ARRAY_TAG,
} from './record-arrays/identifier-array';
export { default as RecordArrayManager, fastPush } from './managers/record-array-manager';

// leaked for private use / test use, should investigate removing
export { _clearCaches } from './caches/instance-cache';
export { default as peekCache, removeRecordDataFor } from './caches/cache-utils';

// @ember-data/model needs these temporarily
export { setRecordIdentifier, StoreMap } from './caches/instance-cache';
export { setCacheFor } from './caches/cache-utils';
