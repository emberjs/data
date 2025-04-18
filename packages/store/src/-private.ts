/**
  @module @ember-data/store
*/

export { Store, storeFor } from './-private/store-service';

export { recordIdentifierFor } from './-private/caches/instance-cache';

export { CacheHandler, type StoreRequestContext } from './-private/cache-handler/handler';
export { type CachePolicy } from './-private/cache-handler/types';

export { isResourceCacheKey, isRequestCacheKey } from './-private/caches/identifier-cache';

export { constructResource } from './-private/utils/construct-resource';

export type { ReactiveDocument as Document } from './-private/document';
export type { InstanceCache } from './-private/caches/instance-cache';

export type {
  FindRecordQuery,
  Request,
  SaveRecordMutation,
  RequestState,
  RequestStateService,
} from './-private/network/request-cache';

export type { CreateRecordProperties } from './-private/store-service';

// TODO this should be a deprecated helper but we have so much usage of it
// to also eliminate
export { coerceId, ensureStringId } from './-private/utils/coerce-id';
export type { NativeProxy } from './-private/record-arrays/native-proxy-type-fix';
export {
  IdentifierArray as LiveArray,
  Collection as CollectionRecordArray,
  notifyArray,
  SOURCE,
  MUTATE,
  ARRAY_SIGNAL,
} from './-private/record-arrays/identifier-array';
export { RecordArrayManager, fastPush } from './-private/managers/record-array-manager';

// leaked for private use / test use, should investigate removing
export { _clearCaches } from './-private/caches/instance-cache';
export { peekCache, removeRecordDataFor } from './-private/caches/cache-utils';

// @ember-data/model needs these temporarily
export { setRecordIdentifier, StoreMap } from './-private/caches/instance-cache';
export { setCacheFor } from './-private/caches/cache-utils';
export { normalizeModelName as _deprecatingNormalize } from './-private/utils/normalize-model-name';
export type { StoreRequestInput } from './-private/cache-handler/handler';
export { RelatedCollection } from './-private/record-arrays/many-array';

export { log, logGroup } from './-private/debug/utils';
