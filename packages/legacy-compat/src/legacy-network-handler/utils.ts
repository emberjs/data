import { deprecate } from '@ember/debug';

import type Store from '@ember-data/store';
import { DEPRECATE_RSVP_PROMISE } from '@warp-drive/build-config/deprecations';

function isObject<T>(value: unknown): value is T {
  return value !== null && typeof value === 'object';
}

export function _objectIsAlive(object: unknown): boolean {
  return isObject<{ isDestroyed: boolean; isDestroying: boolean }>(object)
    ? !(object.isDestroyed || object.isDestroying)
    : false;
}

export function guardDestroyedStore<T>(promise: Promise<T>, store: Store): Promise<T> {
  return promise.then((_v) => {
    if (!_objectIsAlive(store)) {
      if (DEPRECATE_RSVP_PROMISE) {
        deprecate(
          `A Promise did not resolve by the time the store was destroyed. This will error in a future release.`,
          false,
          {
            id: 'ember-data:rsvp-unresolved-async',
            until: '5.0',
            for: '@ember-data/store',
            since: {
              available: '4.5',
              enabled: '4.5',
            },
          }
        );
      }
    }

    return _v;
  });
}

export function _bind<T extends (...args: unknown[]) => boolean>(fn: T, ...args: unknown[]) {
  return function () {
    // eslint-disable-next-line prefer-spread
    return fn.apply(undefined, args);
  };
}

export function _guard<T>(promise: Promise<T>, test: () => boolean): Promise<T> {
  const guarded = promise.finally(() => {
    if (!test()) {
      // @ts-expect-error this is a private RSVPPromise API that won't always be there
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unsafe-member-access
      guarded._subscribers ? (guarded._subscribers.length = 0) : null;
    }
  });

  return guarded;
}
