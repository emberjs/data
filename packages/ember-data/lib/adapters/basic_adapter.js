var normalizer = requireModule('json-normalizer'),
    Processor = normalizer.Processor,
    camelizeKeys = normalizer.camelizeKeys;

var capitalize = Ember.String.capitalize;

var DataProcessor = function() {
  Processor.apply(this, arguments);
};

DataProcessor.prototype = Ember.create(Processor.prototype);

Ember.merge(DataProcessor.prototype, {
  munge: function(callback, binding) {
    callback.call(binding, this.json);
    return this;
  }
});

function ArrayProcessor(array) {
  this.array = array;
}

ArrayProcessor.prototype = {
  constructor: ArrayProcessor,

  camelizeKeys: function() {
    var array = this.array;
    for (var i=0, l=array.length; i<l; i++) {
      array[i] = camelizeKeys(array[i]);
    }

    return this;
  },

  munge: function(callback, binding) {
    var array = this.array;
    for (var i=0, l=array.length; i<l; i++) {
      callback.call(binding, array[i]);
    }

    return this;
  }
};

var transforms = {};

function registerTransform(name, transforms) {
  transforms[name] = transforms;
}

function clearTransforms() {
  transforms = {};
}

Ember.merge(DataProcessor.prototype, {
  applyTransforms: function(transform) {

  }
});

DS.process = function(json) {
  if (Ember.typeOf(json) === 'array') {
    return new ArrayProcessor(json);
  } else {
    return new DataProcessor(json);
  }
};

function ObjectLoader(store, type) {
  return function(object) {
    var json;

    if (object instanceof DataProcessor) {
      json = object.json;
    } else {
      json = object;
    }

    store.load(type, json);
  };
}

function ArrayLoader(store, type, queryArray) {
  return function(array) {
    var json;

    if (array instanceof ArrayProcessor) {
      json = array.array;
    } else {
      json = array;
    }

    var references = json.map(function(object) {
      return store.load(type, object);
    });

    queryArray.load(references);
  };
}

function HasManyLoader(store, record, relationship) {
  return function(array) {
    var json;

    if (array instanceof ArrayProcessor) {
      json = array.array;
    } else {
      json = array;
    }

    var ids = json.map(function(obj) { return obj.id; });

    store.loadMany(relationship.type, json);
    store.loadHasMany(record, relationship.key, ids);
  };
}

/**
  @class BasicAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
**/

DS.BasicAdapter = DS.Adapter.extend({
  find: function(store, type, id) {
    var sync = type.sync;

    Ember.assert("You are trying to use the BasicAdapter to find id '" + id + "' of " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement find(), but you are trying to find id '" + id + "'.", sync.find);

    sync.find(id, ObjectLoader(store, type));
  },

  findQuery: function(store, type, query, recordArray) {
    var sync = type.sync;

    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement query(), but you are trying to query " + type + ".", sync.query);

    sync.query(query, ArrayLoader(store, type, recordArray));
  },

  findHasMany: function(store, record, relationship, data) {
    var name = capitalize(relationship.key),
        sync = record.constructor.sync,
        load = HasManyLoader(store, record, relationship);

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
    sync.createRecord(record, saveProcessorFactory(store, type));
  },

  updateRecord: function(store, type, record) {
    var sync = type.sync;
    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement updateRecord(), but you are trying to update a " + type + " record", sync.updateRecord);
    sync.updateRecord(record, saveProcessorFactory(store, type, true));
  },

  deleteRecord: function(store, type, record) {
    var sync = type.sync;
    Ember.assert("You are trying to use the BasicAdapter to query " + type + " but " + type + ".sync was not found", sync);
    Ember.assert("The sync code on " + type + " does not implement deleteRecord(), but you are trying to delete a " + type + " record", sync.deleteRecord);
    sync.deleteRecord(record, saveProcessorFactory(store, type, true));
  }
});

DS.registerTransforms = function(kind, object) {
  registeredTransforms[kind] = object;
};

DS.clearTransforms = function() {
  registeredTransforms = {};
};

DS.clearTransforms();
