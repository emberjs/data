import type { ContextOwner } from './context';
import type { Deferred, DeferredFuture, Future } from './types';

const IS_FUTURE = Symbol('IS_FUTURE');

export function isFuture<T>(maybe: Future<T> | Promise<T>): maybe is Future<T> {
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

export function createFuture<T>(owner: ContextOwner): DeferredFuture<T> {
  const deferred = createDeferred<T>() as unknown as DeferredFuture<T>;
  const { promise } = deferred;
  promise[IS_FUTURE] = true;
  promise.getStream = () => {
    return owner.getStream();
  };
  promise.abort = () => {
    owner.abort();
  };

  return deferred;
}
