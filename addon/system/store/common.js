import Ember from 'ember';

var get = Ember.get;

export function _bind(fn) {
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(undefined, args);
  };
}

export function _guard(promise, test) {
  var guarded = promise['finally'](function() {
    if (!test()) {
      guarded._subscribers.length = 0;
    }
  });

  return guarded;
}

export function _objectIsAlive(object) {
  return !(get(object, "isDestroyed") || get(object, "isDestroying"));
}
