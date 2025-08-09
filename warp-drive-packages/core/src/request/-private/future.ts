import { DEBUG } from '@warp-drive/build-config/env';

import { IS_FUTURE, type StructuredDocument } from '../../types/request';
import type { ContextOwner } from './context';
import type { Deferred, DeferredFuture, Future } from './types';
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
  (promise as Future<T>).id = future.id;
  (promise as Future<T>).lid = future.lid;
  (promise as Future<T>).requester = future.requester;

  if (DEBUG) {
    // @ts-expect-error
    promise.toJSON = () => {
      const id = 'Future<' + (promise as Future<T>).id + '>';
      if ((promise as Future<T>).lid) {
        return `${id} (${(promise as Future<T>).lid!.lid})`;
      }
      return id;
    };
  }

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
  promise.id = owner.requestId;
  promise.lid = owner.god.identifier;
  promise.requester = owner.god.requester;

  if (DEBUG) {
    // @ts-expect-error
    promise.toJSON = () => {
      const id = 'Future<' + promise.id + '>';
      if (promise.lid) {
        return `${id} (${promise.lid.lid})`;
      }
      return id;
    };
  }

  deferred.promise = promise;
  return deferred;
}
