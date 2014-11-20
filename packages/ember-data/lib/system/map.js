/**
 * Polyfill Ember.Map behavior for Ember <= 1.7
 * This can probably be removed before 1.0 final
*/
var mapForEach, deleteFn;

function OrderedSet(){
  Ember.OrderedSet.apply(this, arguments);
}

function Map() {
  Ember.Map.apply(this, arguments);
}

function MapWithDefault(){
  Ember.MapWithDefault.apply(this, arguments);
}

var testMap = Ember.Map.create();
testMap.set('key', 'value');

var usesOldBehavior = false;

testMap.forEach(function(value, key){
  usesOldBehavior = value === 'key' && key === 'value';
});

Map.prototype            = Ember.create(Ember.Map.prototype);
MapWithDefault.prototype = Ember.create(Ember.MapWithDefault.prototype);
OrderedSet.prototype     = Ember.create(Ember.OrderedSet.prototype);

OrderedSet.create = function(){
  return new OrderedSet();
};

/**
 * returns a function that calls the original
 * callback function in the correct order.
 * if we are in pre-Ember.1.8 land, Map/MapWithDefault
 * forEach calls with key, value, in that order.
 * >= 1.8 forEach is called with the order value, key as per
 * the ES6 spec.
*/
function translate(valueKeyOrderedCallback){
  return function(key, value){
    valueKeyOrderedCallback.call(this, value, key);
  };
}

// old, non ES6 compliant behavior
if (usesOldBehavior){
  mapForEach = function(callback, thisArg){
    this.__super$forEach(translate(callback), thisArg);
  };

  /* alias to remove */
  deleteFn = function(thing){
    this.remove(thing);
  };

  Map.prototype.__super$forEach = Ember.Map.prototype.forEach;
  Map.prototype.forEach = mapForEach;
  Map.prototype.delete = deleteFn;

  MapWithDefault.prototype.forEach = mapForEach;
  MapWithDefault.prototype.__super$forEach = Ember.MapWithDefault.prototype.forEach;
  MapWithDefault.prototype.delete = deleteFn;

  OrderedSet.prototype.delete = deleteFn;
}

MapWithDefault.constructor = MapWithDefault;
Map.constructor = Map;

MapWithDefault.create = function(options){
  if (options) {
    return new MapWithDefault(options);
  } else {
    return new Map();
  }
};

Map.create = function(){
  return new this.constructor();
};

export default Map;
export {Map, MapWithDefault, OrderedSet};
