var camelize = Ember.String.camelize;

var ObjectProcessor = function(json, type, store) {
  this.json = json;
  this.type = type;
  this.store = store;
};

ObjectProcessor.prototype = {
  load: function() {
    this.store.load(this.type, this.json);
  },

  camelizeKeys: function() {
    var json = this.json, value;

    for (var prop in json) {
      value = json[prop];
      delete json[prop];
      json[camelize(prop)] = value;
    }

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
