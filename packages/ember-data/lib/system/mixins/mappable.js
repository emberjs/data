var classify = Ember.String.classify, get = Ember.get;

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
