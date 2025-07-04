import { getOrSetUniversal } from '../../types/-private';

export type CacheResult<T = unknown, E = unknown> = { isError: true; result: E } | { isError: false; result: T };

export type Awaitable<T = unknown, E = unknown> = {
  then: (onFulfilled: (value: T) => unknown, onRejected: (reason: E) => unknown) => unknown;
  catch: (onRejected: (reason: E) => unknown) => unknown;
  finally: (onFinally: () => unknown) => unknown;
};

export const PromiseCache: WeakMap<Awaitable, CacheResult> = getOrSetUniversal(
  'PromiseCache',
  new WeakMap<Awaitable, CacheResult>()
);
export const RequestMap: Map<number, CacheResult> = getOrSetUniversal('RequestMap', new Map<number, CacheResult>());

export function setRequestResult(requestId: number, result: CacheResult): void {
  RequestMap.set(requestId, result);
}
export function clearRequestResult(requestId: number): void {
  RequestMap.delete(requestId);
}
export function getRequestResult(requestId: number): CacheResult | undefined {
  return RequestMap.get(requestId);
}

export function setPromiseResult(promise: Promise<unknown> | Awaitable, result: CacheResult): void {
  PromiseCache.set(promise, result);
}

export function getPromiseResult<T, E>(promise: Promise<T> | Awaitable<T, E>): CacheResult<T, E> | undefined {
  return PromiseCache.get(promise) as CacheResult<T, E> | undefined;
}
