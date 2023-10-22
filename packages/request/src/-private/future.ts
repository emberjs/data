import { IS_FUTURE, type StructuredDocument } from '@warp-drive/core-types/request';

import type { ContextOwner } from './context';
import { type Deferred, type DeferredFuture, type Future } from './types';
import { enhanceReason } from './utils';

export function isFuture<T>(maybe: unknown): maybe is Future<T> {
  return Boolean(maybe && maybe instanceof Promise && (maybe as Future<T>)[IS_FUTURE] === true);
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (v: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

export function upgradePromise<T>(promise: Promise<StructuredDocument<T>>, future: Future<T>): Future<T> {
  (promise as Future<T>)[IS_FUTURE] = true;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  (promise as Future<T>).getStream = future.getStream;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  (promise as Future<T>).abort = future.abort;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  (promise as Future<T>).onFinalize = future.onFinalize;

  return promise as Future<T>;
}

export function createFuture<T>(owner: ContextOwner): DeferredFuture<T> {
  const deferred = createDeferred<T>() as unknown as DeferredFuture<T>;
  let { promise } = deferred;
  let cbs: Array<() => void> | undefined;
  promise = promise.finally(() => {
    owner.resolveStream();
    if (cbs) {
      cbs.forEach((cb) => cb());
    }
  }) as Future<T>;
  promise.onFinalize = (fn: () => void) => {
    cbs = cbs || [];
    cbs.push(fn);
  };
  promise[IS_FUTURE] = true;
  promise.getStream = () => {
    return owner.getStream();
  };
  promise.abort = (reason?: string) => {
    owner.abort(enhanceReason(reason));
  };
  deferred.promise = promise;
  return deferred;
}
