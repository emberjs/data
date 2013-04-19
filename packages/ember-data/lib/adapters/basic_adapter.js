require("ember-data/adapters/basic_adapter/loaders");
require("ember-data/adapters/basic_adapter/processors");

/**
  @module data
  @submodule data-adapters
*/

var passthruTransform = {
  serialize: function(value) { return value; },
  deserialize: function(value) { return value; }
};

var defaultTransforms = {
  string: passthruTransform,
  boolean: passthruTransform,
  number: passthruTransform
};


var capitalize = Ember.String.capitalize;
var transforms = {};

function registerTransform(name, transforms) {
  transforms[name] = transforms;
}

function clearTransforms() {
  transforms = {};
}

var registeredTransforms = {};

DS.registerTransforms = function(kind, object) {
  registeredTransforms[kind] = object;
};

DS.clearTransforms = function() {
  registeredTransforms = {};
};

DS.clearTransforms();

DS.process = function(json) {
  if (Ember.typeOf(json) === 'array') {
    return new DS.ArrayProcessor(json);
  } else {
    return new DS.DataProcessor(json);
  }
};

/**
  @class BasicAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
**/
function didSave(store, record) {
  return function(data) {
    store.didSaveRecord(record, data);
  };
}

var PassthruSerializer = DS.Serializer.extend({
  extractId: function(type, data) {
    return data.id + '';
  },

  extractAttribute: function(type, data, name) {
    return data[name];
  },

  extractHasMany: function(type, data, name) {
    return data[name];
  },

  extractBelongsTo: function(type, data, name) {
    return data[name];
  },

  deserializeValue: function(value) {
    return value;
  },

  serializeValue: function(value) {
    return value;
  }
});

/**
  @class BasicAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
**/
DS.BasicAdapter = DS.Adapter.extend({
  serializer: PassthruSerializer,

  find: function(store, type, id) {
    var sync = type.sync;

    Ember.assert("You are trying to use the BasicAdapter to find id '" + id + "' of " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement find(), but you are trying to find id '" + id + "'.", sync.find);

    sync.find(id, DS.ObjectLoader(store, type));
  },

  findQuery: function(store, type, query, recordArray) {
    var sync = type.sync;

    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement query(), but you are trying to query " + type + ".", sync.query);

    sync.query(query, DS.ArrayLoader(store, type, recordArray));
  },

  findHasMany: function(store, record, relationship, data) {
    var name = capitalize(relationship.key),
        sync = record.constructor.sync,
        load = DS.HasManyLoader(store, record, relationship);

    Ember.assert("You are trying to use the BasicAdapter to query " + record.constructor + " but " + record.constructor + ".sync was not found", sync);

    var options = {
      relationship: relationship.key,
      data: data
    };

    if (sync['find'+name]) {
      sync['find' + name](record, options, load);
    } else if (sync.findHasMany) {
      sync.findHasMany(record, options, load);
    } else {
      Ember.assert("You are trying to use the BasicAdapter to find the " + relationship.key + " has-many relationship, but " + record.constructor + ".sync did not implement findHasMany or find" + name + ".", false);
    }
  },

  createRecord: function(store, type, record) {
    var sync = type.sync;

    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement createRecord(), but you are trying to create a " + type + " record", sync.createRecord);

    sync.createRecord(record, didSave(store, record));
  },

  updateRecord: function(store, type, record) {
    var sync = type.sync;
    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement updateRecord(), but you are trying to update a " + type + " record", sync.updateRecord);

    sync.updateRecord(record, didSave(store, record));
  },

  deleteRecord: function(store, type, record) {
    var sync = type.sync;
    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement deleteRecord(), but you are trying to delete a " + type + " record", sync.deleteRecord);

    sync.deleteRecord(record, didSave(store, record));
  }
});

