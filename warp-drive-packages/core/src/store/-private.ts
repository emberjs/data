export { Store } from './deprecated/store.ts';

export { storeFor } from './-private/store-service.ts';

export { recordIdentifierFor } from './-private/caches/instance-cache.ts';

export { CacheHandler, type StoreRequestContext } from './-private/cache-handler/handler.ts';
export { type CachePolicy } from './-private/cache-handler/types.ts';

export { isResourceKey, isRequestKey } from './-private/managers/cache-key-manager.ts';

export { constructResource } from './-private/utils/construct-resource.ts';
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
export { type ReactiveResourceArray } from './-private/record-arrays/resource-array.ts';
export {
  type LegacyLiveArray,
  /** @deprecated use LegacyLiveArray or ReactiveResourceArray */
  type LegacyLiveArray as LiveArray,
} from './-private/record-arrays/legacy-live-array.ts';
export {
  type LegacyQueryArray,
  /** @deprecated use LegacyQueryArray or ReactiveResourceArray */
  type LegacyQueryArray as CollectionRecordArray,
} from './-private/record-arrays/legacy-query.ts';
export { RecordArrayManager, fastPush } from './-private/managers/record-array-manager.ts';

// leaked for private use / test use, should investigate removing
export { _clearCaches } from './-private/caches/instance-cache.ts';

// @ember-data/model needs these temporarily
export { setRecordIdentifier, StoreMap } from './-private/caches/instance-cache.ts';
export { normalizeModelName as _deprecatingNormalize } from './-private/utils/normalize-model-name.ts';
export type { StoreRequestInput } from './-private/cache-handler/handler.ts';
export {
  type LegacyManyArray,
  type LegacyManyArray as RelatedCollection,
  createLegacyManyArray,
} from './-private/record-arrays/legacy-many-array.ts';

export { log, logGroup } from './-private/debug/utils';
export { getPromiseState, type PromiseState } from './-private/new-core-tmp/promise-state.ts';

export {
  DISPOSE,
  createRequestSubscription,
  type SubscriptionArgs,
  type RequestSubscription,
} from './-private/new-core-tmp/request-subscription.ts';
export {
  getRequestState,
  type RequestLoadingState,
  type RequestCacheRequestState as RequestState,
} from './-private/new-core-tmp/request-state.ts';

export { createMemo, type SignalHooks, waitFor } from './-private/new-core-tmp/reactivity/configure.ts';
export {
  memoized,
  gate,
  entangleSignal,
  defineSignal,
  defineGate,
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
