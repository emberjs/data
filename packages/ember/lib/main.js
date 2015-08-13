// Shim Ember module

// #support for Ember 2.0
Ember.ArrayPolyfills = Ember.ArrayPolyfills || Array.prototype;

function macroFor(name) {
  return function(obj, callback, thisArg) {
    return obj[name] ? obj[name](callback, thisArg) : Array.prototype[name].call(obj, callback, thisArg);
  };
}

Ember.EnumerableUtils = Ember.EnumerableUtils || {
  map:     macroFor('map'),
  indexOf: macroFor('indexOf'),
  forEach: macroFor('forEach'),
  filter:  macroFor('filter')
};
// /support for Ember 2.0

export default Ember;
