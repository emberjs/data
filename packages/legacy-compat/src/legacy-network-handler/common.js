import { deprecate } from '@ember/debug';

import { DEPRECATE_RSVP_PROMISE } from '@ember-data/private-build-infra/current-deprecations';

export function _bind(fn, ...args) {
  return function () {
    return fn.apply(undefined, args);
  };
}

export function _guard(promise, test) {
  let guarded = promise.finally(() => {
    if (!test()) {
      guarded._subscribers ? (guarded._subscribers.length = 0) : null;
    }
  });

  return guarded;
}

export function _objectIsAlive(object) {
  return !(object.isDestroyed || object.isDestroying);
}

export function guardDestroyedStore(promise, store) {
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
