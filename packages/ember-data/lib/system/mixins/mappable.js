var classify = Ember.String.classify, get = Ember.get;

/**
@private

  The Mappable mixin is designed for classes that would like to
  behave as a map for configuration purposes.

  For example, the DS.Adapter class can behave like a map, with
  more semantic API, via the `map` API:

    DS.Adapter.map('App.Person', { firstName: { key: 'FIRST' } });

  Class configuration via a map-like API has a few common requirements
  that differentiate it from the standard Ember.Map implementation.

  First, values often are provided as strings that should be normalized
  into classes the first time the configuration options are used.

  Second, the values configured on parent classes should also be taken
  into account.

  Finally, setting the value of a key sometimes should merge with the
  previous value, rather than replacing it.

  This mixin provides a instance method, `createInstanceMapFor`, that
  will reify all of the configuration options set on an instance's
  constructor and provide it for the instance to use.

  Classes can implement certain hooks that allow them to customize
  the requirements listed above:

  * `resolveMapConflict` - called when a value is set for an existing
    value
  * `transformMapKey` - allows a key name (for example, a global path
    to a class) to be normalized
  * `transformMapValue` - allows a value (for example, a class that
    should be instantiated) to be normalized

  Classes that implement this mixin should also implement a class
  method built using the `generateMapFunctionFor` method:

    DS.Adapter.reopenClass({
      map: DS.Mappable.generateMapFunctionFor('attributes', function(key, newValue, map) {
        var existingValue = map.get(key);

        for (var prop in newValue) {
          if (!newValue.hasOwnProperty(prop)) { continue; }
          existingValue[prop] = newValue[prop];
        }
      })
    });

   The function passed to `generateMapFunctionFor` is invoked every time a
   new value is added to the map.
**/

var resolveMapConflict = function(oldValue, newValue, mappingsKey) {
  return oldValue;
};

var transformMapKey = function(key, value) {
  return key;
};

var transformMapValue = function(key, value) {
  return value;
};

DS._Mappable = Ember.Mixin.create({
  createInstanceMapFor: function(mapName) {
    var instanceMeta = Ember.metaPath(this, ['DS.Mappable'], true);

    instanceMeta.values = instanceMeta.values || {};

    if (instanceMeta.values[mapName]) { return instanceMeta.values[mapName]; }

    var instanceMap = instanceMeta.values[mapName] = new Ember.Map();

    var klass = this.constructor;

    while (klass && klass !== DS.Store) {
      this._copyMap(mapName, klass, instanceMap);
      klass = klass.superclass;
    }

    instanceMeta.values[mapName] = instanceMap;
    return instanceMap;
  },

  _copyMap: function(mapName, klass, instanceMap) {
    var classMeta = Ember.metaPath(klass, ['DS.Mappable'], true);

    var classMap = classMeta[mapName];
    if (classMap) {
      classMap.forEach(eachMap, this);
    }

    function eachMap(key, value) {
      var transformedKey = (klass.transformMapKey || transformMapKey)(key, value);
      var transformedValue = (klass.transformMapValue || transformMapValue)(key, value);

      var oldValue = instanceMap.get(transformedKey);
      var newValue = transformedValue;

      if (oldValue) {
        newValue = (this.constructor.resolveMapConflict || resolveMapConflict)(oldValue, newValue, mapName);
      }

      instanceMap.set(transformedKey, newValue);
    }
  }


});

DS._Mappable.generateMapFunctionFor = function(mapName, transform) {
  return function(key, value) {
    var meta = Ember.metaPath(this, ['DS.Mappable'], true);
    var map = meta[mapName] || Ember.MapWithDefault.create({
      defaultValue: function() { return {}; }
    });

    transform.call(this, key, value, map);

    meta[mapName] = map;
  };
};
