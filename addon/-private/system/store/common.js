import { get } from '@ember/object';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';
import { Promise } from 'rsvp';

const { __bind, __guard, __objectIsAlive } = heimdall.registerMonitor(
  'system.store.common',
  '_bind',
  '_guard',
  '_objectIsAlive'
);

export function _bind(fn, ...args) {
  heimdall.increment(__bind);

  return function() {
    return fn.apply(undefined, args);
  };
}

export function _guard(promise, test) {
  heimdall.increment(__guard);
  let guarded = promise['finally'](function() {
    if (!test()) {
      guarded._subscribers.length = 0;
    }
  });

  return guarded;
}

export function _objectIsAlive(object) {
  heimdall.increment(__objectIsAlive);
  return !(get(object, 'isDestroyed') || get(object, 'isDestroying'));
}

let ASYNC_REQUEST_COUNT = 0;
export function incrementRequestCount() {
  ASYNC_REQUEST_COUNT++;
}

if (DEBUG) {
  Ember.Test.registerWaiter(() => {
    return ASYNC_REQUEST_COUNT === 0;
  });
}

export function guardDestroyedStore(promise, store, label) {
  promise = Promise.resolve(promise, label);

  return _guard(promise, () => {
    if (DEBUG) {
      ASYNC_REQUEST_COUNT--;
    }
    return _objectIsAlive(store);
  });
}
