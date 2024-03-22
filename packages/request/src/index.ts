export { RequestManager as default } from './-private/manager';
export { createDeferred } from './-private/future';
export type { Future, Handler, CacheHandler, NextFn } from './-private/types';
export type {
  RequestContext,
  ImmutableRequestInfo,
  RequestInfo,
  ResponseInfo,
  StructuredDocument,
  StructuredErrorDocument,
  StructuredDataDocument,
} from '@warp-drive/core-types/request';
export { setPromiseResult, getPromiseResult } from './-private/promise-cache';
export type { Awaitable } from './-private/promise-cache';
