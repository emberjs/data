/**
 * @module
 * @mergeModuleWith <project>
 */

import { getRuntimeConfig, setLogging } from './types/runtime.ts';

export { Fetch } from './request/-private/fetch.ts';
export { RequestManager } from './request/-private/manager.ts';

// @ts-expect-error adding to globalThis
globalThis.setWarpDriveLogging = setLogging;

// @ts-expect-error adding to globalThis
globalThis.getWarpDriveRuntimeConfig = getRuntimeConfig;

export {
  Store,
  type StoreRequestContext,
  CacheHandler,
  type Document,
  type CachePolicy,
  type StoreRequestInput,
  recordIdentifierFor,
  storeFor,
} from './store/-private.ts';

export type {
  DocumentCacheOperation,
  CacheOperation,
  NotificationType,
} from './store/-private/managers/notification-manager.ts';

export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
  setKeyInfoForResource,
} from './store/-private/caches/identifier-cache.ts';
