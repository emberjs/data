import Ember from 'ember';

const {
  get
} = Ember;

const {
  __bind,
  __guard,
  __objectIsAlive
} = heimdall.registerMonitor('system.store.common',
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
  return !(get(object, "isDestroyed") || get(object, "isDestroying"));
}
