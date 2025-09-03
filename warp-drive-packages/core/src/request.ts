import type { RequestInfo } from './types/request.ts';
import type { RequestSignature } from './types/symbols.ts';

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

/**
 * Brands the supplied object with the supplied response type.
 *
 * ```ts
 * import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
 * import { withResponseType } from '@warp-drive/core/request';
 * import type { User } from '#/data/user.ts'
 *
 * const result = await store.request(
 *  withResponseType<ReactiveDataDocument<User>>({ url: '/users/1' })
 * );
 *
 * result.content.data; // will have type User
 * ```
 *
 */
export function withResponseType<T>(obj: RequestInfo): RequestInfo<T> & { [RequestSignature]: T } {
  return obj as RequestInfo<T> & {
    [RequestSignature]: T;
  };
}

/**
 * @deprecated use {@link withResponseType} instead
 */
export { withResponseType as withBrand };
