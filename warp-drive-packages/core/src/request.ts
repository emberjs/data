export { createDeferred } from './request/-private/future.ts';
export type {
  Future,
  Handler,
  CacheHandler,
  NextFn,
  Deferred,
  ManagedRequestPriority,
} from './request/-private/types.ts';
export { setPromiseResult, getPromiseResult } from './request/-private/promise-cache.ts';
export type { Awaitable } from './request/-private/promise-cache.ts';
export type { Context } from './request/-private/context.ts';
