var camelize = Ember.String.camelize,
    get = Ember.get,
    registeredTransforms;

var passthruTransform = {
  serialize: function(value) { return value; },
  deserialize: function(value) { return value; }
};

var defaultTransforms = {
  string: passthruTransform,
  boolean: passthruTransform,
  number: passthruTransform
};

var ObjectProcessor = function(json, type, store) {
  this.json = json;
  this.type = type;
  this.store = store;
};

ObjectProcessor.prototype = {
  load: function() {
    this.store.load(this.type, {}, this.json);
  },

  camelizeKeys: function() {
    var json = this.json, value;

    for (var prop in json) {
      value = json[prop];
      delete json[prop];
      json[camelize(prop)] = value;
    }

    return this;
  },

  applyTransforms: function(transformType) {
    var transforms = registeredTransforms[transformType],
        json = this.json;

    Ember.assert("You are trying to apply the '" + transformType + "' transforms, but you didn't register any transforms with that name", transforms);

    get(this.type, 'attributes').forEach(function(name, attribute) {
      var attributeType = attribute.type,
          value = json[name];

      var transform = transforms[attributeType] || defaultTransforms[attributeType];

      Ember.assert("Your model specified the '" + attributeType + "' type for the '" + name + "' attribute, but no transform for that type was registered", transform);

      json[name] = transform.deserialize(value);
    });

    return this;
  }
};

var processorFactory = function(store, type) {
  return function(json) {
    return new ObjectProcessor(json, type, store);
  };
};


DS.BasicAdapter = DS.Adapter.extend({
  find: function(store, type, id) {
    var sync = type.sync;

    Ember.assert("You are trying to use the BasicAdapter to find id '" + id + "' of " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement find(), but you are trying to find id '" + id + "'.", sync.find);

    sync.find(id, processorFactory(store, type));
  }
});

DS.registerTransforms = function(kind, object) {
  registeredTransforms[kind] = object;
};

DS.clearTransforms = function() {
  registeredTransforms = {};
};

DS.clearTransforms();
