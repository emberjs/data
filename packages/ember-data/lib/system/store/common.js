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

// Used by the store to normalize IDs entering the store.  Despite the fact
// that developers may provide IDs as numbers (e.g., `store.find(Person, 1)`),
// it is important that internally we use strings, since IDs may be serialized
// and lose type information.  For example, Ember's router may put a record's
// ID into the URL, and if we later try to deserialize that URL and find the
// corresponding record, we will not know if it is a string or a number.
export function coerceId(id) {
  return id == null ? null : id+'';
}
