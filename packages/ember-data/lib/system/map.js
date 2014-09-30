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

Map.prototype            = Object.create(Ember.Map.prototype);
MapWithDefault.prototype = Object.create(Ember.MapWithDefault.prototype);
OrderedSet.prototype     = Object.create(Ember.OrderedSet.prototype);

OrderedSet.create = function(){
  return new OrderedSet();
};

function translate(valueKeyOrderedCallback){
  return function(key, value){
    valueKeyOrderedCallback.call(this, value, key);
  };
}

// old, non ES6 compliant behavir
if (usesOldBehavior){
  mapForEach = function(callback, thisArg){
    Ember.Map.prototype.forEach.call(this, translate(callback), thisArg);
  };

  /* alias to remove */
  deleteFn = function(thing){
    this.remove.apply(this, arguments);
  };

  Map.prototype.forEach = mapForEach;
  Map.prototype.delete = deleteFn;

  MapWithDefault.prototype.forEach = mapForEach;
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
