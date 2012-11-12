var classify = Ember.String.classify, get = Ember.get;

/**
  @private

  The Mappable mixin is designed to assist classes that need supply a mapping
  API on their class, then reify that mapping to make it available on their
  instances.

  For example, DS.Store uses this mixin to implement the `registerAdapter` API.
  API consumers can call `registerAdapter`, which adds entries to the
  `_adaptersMap` private property.

  The first time an adapter is looked up, the instance calls `_reifyMappings`
  with the mapping name. This collapse all of the registered mappings in the
  entire class hierarchy into a mapping on the instance.

  This mixin is not currently designed for public consumption. It's API does
  not yet expose the firm yet yielding API contours that Ember.js developers
  expect. If you want to make this available more broadly, please clean it up
  first.
*/
DS.Mappable = Ember.Mixin.create({
  _reifyMappings: function(mappingName) {
    var mappingsKey = '_' + mappingName + 'Map',
        flag = '_didReify' + classify(mappingName) + 'Mappings';

    if (this[flag]) { return; }
    this[flag] = true;

    var mapping = this[mappingsKey] = new Ember.Map();

    var klass = this.constructor;

    while (klass && klass !== DS.Store) {
      this._reifyMappingForClass(mappingsKey, klass, mapping);
      klass = klass.superclass;
    }
  },

  _reifyMappingForClass: function(mappingsKey, klass, mapping) {
    var classAdapterMap = klass[mappingsKey];
    if (classAdapterMap) {
      classAdapterMap.forEach(eachAdapterMap);
    }

    function eachAdapterMap(key, object) {
      var type;

      if (typeof key === 'string') {
        type = get(Ember.lookup, key);
        Ember.assert("Could not find model at path " + key, type);
      } else {
        type = key;
      }

      if (!mapping.get(type, object)) {
        if (Ember.Object.detect(object)) {
          object = object.create();
        }

        mapping.set(type, object);
      }
    }
  }
});
