import Ember from 'ember';

var get = Ember.get;

const {
  __bind,
  __guard,
  __objectIsAlive
} = heimdall.registerMonitor('system.store.common',
  '_bind',
  '_guard',
  '_objectIsAlive'
);

export function _bind(fn) {
  heimdall.increment(__bind);
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(undefined, args);
  };
}

export function _guard(promise, test) {
  heimdall.increment(__guard);
  var guarded = promise['finally'](function() {
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
