export { Store, storeFor } from './-private/store-service.ts';

export { recordIdentifierFor } from './-private/caches/instance-cache.ts';

export { CacheHandler, type StoreRequestContext } from './-private/cache-handler/handler.ts';
export { type CachePolicy } from './-private/cache-handler/types.ts';

export { isStableIdentifier, isDocumentIdentifier } from './-private/caches/identifier-cache.ts';

export { constructResource } from './-private/utils/construct-resource.ts';

export type { ReactiveDocument as Document } from './-private/document.ts';
export type { InstanceCache } from './-private/caches/instance-cache.ts';

export type {
  FindRecordQuery,
  Request,
  SaveRecordMutation,
  RequestCacheRequestState,
  RequestStateService,
} from './-private/network/request-cache.ts';

export type { CreateRecordProperties } from './-private/store-service.ts';

// TODO this should be a deprecated helper but we have so much usage of it
// to also eliminate
export { coerceId, ensureStringId } from './-private/utils/coerce-id.ts';
export type { NativeProxy } from './-private/record-arrays/native-proxy-type-fix.ts';
export {
  IdentifierArray as LiveArray,
  Collection as CollectionRecordArray,
  SOURCE,
  MUTATE,
} from './-private/record-arrays/identifier-array.ts';
export { RecordArrayManager, fastPush } from './-private/managers/record-array-manager.ts';

// leaked for private use / test use, should investigate removing
export { _clearCaches } from './-private/caches/instance-cache.ts';
export { peekCache, removeRecordDataFor } from './-private/caches/cache-utils.ts';

// @ember-data/model needs these temporarily
export { setRecordIdentifier, StoreMap } from './-private/caches/instance-cache.ts';
export { setCacheFor } from './-private/caches/cache-utils';
export { normalizeModelName as _deprecatingNormalize } from './-private/utils/normalize-model-name.ts';
export type { StoreRequestInput } from './-private/cache-handler/handler.ts';
export { RelatedCollection } from './-private/record-arrays/many-array.ts';

export { log, logGroup } from './-private/debug/utils';
export { getPromiseState, type PromiseState } from './-private/new-core-tmp/promise-state.ts';
export {
  getRequestState,
  type RequestLoadingState,
  type RequestCacheRequestState as RequestState,
} from './-private/new-core-tmp/request-state.ts';
export { getPaginationState } from './-private/new-core-tmp/pagination-state.ts';

export { createMemo, type SignalHooks, waitFor } from './-private/new-core-tmp/reactivity/configure.ts';
export {
  memoized,
  gate,
  entangleSignal,
  defineSignal,
  defineNonEnumerableSignal,
} from './-private/new-core-tmp/reactivity/signal.ts';
export {
  ARRAY_SIGNAL,
  OBJECT_SIGNAL,
  Signals,
  type WarpDriveSignal,
  peekInternalSignal,
  withSignalStore,
  notifyInternalSignal,
  consumeInternalSignal,
  getOrCreateInternalSignal,
} from './-private/new-core-tmp/reactivity/internal.ts';
