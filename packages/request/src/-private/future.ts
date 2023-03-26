import { StructuredDocument } from '@ember-data/types/cache/document';

import type { ContextOwner } from './context';
import type { Deferred, DeferredFuture, Future } from './types';

const IS_FUTURE = Symbol('IS_FUTURE');

export function isFuture<T>(maybe: T | Future<T> | Promise<T>): maybe is Future<T> {
  return maybe[IS_FUTURE] === true;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (v: unknown) => void;
  let promise = new Promise<T>((res, rej) => {
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
  promise.abort = () => {
    owner.abort();
  };
  deferred.promise = promise;
  return deferred;
}
