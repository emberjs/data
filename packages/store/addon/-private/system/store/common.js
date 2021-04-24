import { get } from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

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
  return !(get(object, 'isDestroyed') || get(object, 'isDestroying'));
}

export function guardDestroyedStore(promise, store, label) {
  let token;
  if (DEBUG) {
    token = store._trackAsyncRequestStart(label);
  }
  let wrapperPromise = resolve(promise, label).then((v) => promise);

  return _guard(wrapperPromise, () => {
    if (DEBUG) {
      store._trackAsyncRequestEnd(token);
    }
    return _objectIsAlive(store);
  });
}
