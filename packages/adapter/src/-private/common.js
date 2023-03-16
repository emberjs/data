import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import { DEPRECATE_RSVP_PROMISE } from '@ember-data/private-build-infra/deprecations';

/**
  @module @ember-data/store
*/

export function _bind(fn, ...args) {
  return function () {
    return fn.apply(undefined, args);
  };
}

export function _guard(promise, test) {
  let guarded = promise.finally(() => {
    if (!test()) {
      guarded._subscribers.length = 0;
    }
  });

  return guarded;
}

export function _objectIsAlive(object) {
  return !(object.isDestroyed || object.isDestroying);
}

export function guardDestroyedStore(promise, store, label) {
  let token;
  if (DEBUG) {
    token = store._trackAsyncRequestStart(label);
  }
  let wrapperPromise = resolve(promise, label).then((_v) => {
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

    return promise;
  });

  return _guard(wrapperPromise, () => {
    if (DEBUG) {
      store._trackAsyncRequestEnd(token);
    }
    return _objectIsAlive(store);
  });
}
