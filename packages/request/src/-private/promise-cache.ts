export type CacheResult<T = unknown, E = unknown> = { isError: true; result: E } | { isError: false; result: T };

export const PromiseCache = new WeakMap<Promise<unknown>, CacheResult>();
export const RequestMap = new Map<number, CacheResult>();

export function setRequestResult(requestId: number, result: CacheResult) {
  RequestMap.set(requestId, result);
}
export function clearRequestResult(requestId: number) {
  RequestMap.delete(requestId);
}
export function getRequestResult(requestId: number): CacheResult | undefined {
  return RequestMap.get(requestId);
}

export function setPromiseResult(promise: Promise<unknown>, result: CacheResult) {
  PromiseCache.set(promise, result);
}

export function getPromiseResult<T, E>(promise: Promise<T>): CacheResult<T, E> | undefined {
  return PromiseCache.get(promise) as CacheResult<T, E> | undefined;
}
