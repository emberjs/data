/**
 * @module
 * @mergeModuleWith <project>
 */

import type { ReactiveDocument } from './reactive/-private/document.ts';
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
  type CachePolicy,
  type StoreRequestInput,
  recordIdentifierFor,
  storeFor,
} from './store/-private.ts';

/**
 * @deprecated use `ReactiveDocument` instead
 */
export type Document<T> = ReactiveDocument<T>;

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
} from './store/-private/managers/cache-key-manager.ts';
