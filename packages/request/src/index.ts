import { getRuntimeConfig, setWarpDriveLogging } from '@warp-drive/build-config/runtime';

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

// @ts-expect-error adding to globalThis
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
globalThis.setWarpDriveLogging = setWarpDriveLogging;

// @ts-expect-error adding to globalThis
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
globalThis.getRuntimeConfig = getRuntimeConfig;
