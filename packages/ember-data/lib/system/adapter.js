/**
  An adapter is an object that receives requests from a store and
  translates them into the appropriate action to take against your
  persistence layer. The persistence layer is usually an HTTP API, but may
  be anything, such as the browser's local storage.

  ### Creating an Adapter

  First, create a new subclass of `DS.Adapter`:

      App.MyAdapter = DS.Adapter.extend({
        // ...your code here
      });

  To tell your store which adapter to use, set its `adapter` property:

      App.store = DS.Store.create({
        revision: 3,
        adapter: App.MyAdapter.create()
      });

  `DS.Adapter` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `find()`
    * `createRecord()`
    * `updateRecord()`
    * `deleteRecord()`

   To improve the network performance of your application, you can optimize
   your adapter by overriding these lower-level methods:

    * `findMany()`
    * `createRecords()`
    * `updateRecords()`
    * `deleteRecords()`
    * `commit()`

   For more information about the adapter API, please see `README.md`.
*/

var get = Ember.get, set = Ember.set;

DS.Adapter = Ember.Object.extend(DS._Mappable, {

  init: function() {
    var serializer = get(this, 'serializer');

    if (Ember.Object.detect(serializer)) {
      serializer = serializer.create();
      set(this, 'serializer', serializer);
    }

    this._attributesMap = this.createInstanceMapFor('attributes');

    this._outstandingOperations = new Ember.MapWithDefault({
      defaultValue: function() { return 0; }
    });

    this._dependencies = new Ember.MapWithDefault({
      defaultValue: function() { return new Ember.OrderedSet(); }
    });

    this.registerSerializerTransforms(this.constructor, serializer, {});
    this.registerSerializerMappings(serializer);
  },

  dirtyRecordsForAttributeChange: function(dirtySet, record, attributeName, newValue, oldValue) {
    // TODO: Custom equality checking [tomhuda]
    if (newValue !== oldValue) {
      dirtySet.add(record);
    }
  },

  dirtyRecordsForBelongsToChange: function(dirtySet, child) {
    dirtySet.add(child);
  },

  dirtyRecordsForHasManyChange: function(dirtySet, parent) {
    dirtySet.add(parent);
  },

  /**
    @private

    This method recursively climbs the superclass hierarchy and
    registers any class-registered transforms on the adapter's
    serializer.

    Once it registers a transform for a given type, it ignores
    subsequent transforms for the same attribute type.

    @param {Class} klass the DS.Adapter subclass to extract the
      transforms from
    @param {DS.Serializer} serializer the serializer to register
      the transforms onto
    @param {Object} seen a hash of attributes already seen
  */
  registerSerializerTransforms: function(klass, serializer, seen) {
    var transforms = klass._registeredTransforms, superclass, prop;

    for (prop in transforms) {
      if (!transforms.hasOwnProperty(prop) || prop in seen) { continue; }
      seen[prop] = true;

      serializer.registerTransform(prop, transforms[prop]);
    }

    if (superclass = klass.superclass) {
      this.registerSerializerTransforms(superclass, serializer, seen);
    }
  },

  /**
    @private

    This method recursively climbs the superclass hierarchy and
    registers any class-registered mappings on the adapter's
    serializer.

    @param {Class} klass the DS.Adapter subclass to extract the
      transforms from
    @param {DS.Serializer} serializer the serializer to register the
      mappings onto
  */
  registerSerializerMappings: function(serializer) {
    var mappings = this._attributesMap;

    mappings.forEach(function(type, mapping) {
      serializer.map(type, mapping);
    }, this);
  },

  /**
    The `find()` method is invoked when the store is asked for a record that
    has not previously been loaded. In response to `find()` being called, you
    should query your persistence layer for a record with the given ID. Once
    found, you can asynchronously call the store's `load()` method to load
    the record.

    Here is an example `find` implementation:

      find: function(store, type, id) {
        var url = type.url;
        url = url.fmt(id);

        jQuery.getJSON(url, function(data) {
            // data is a hash of key/value pairs. If your server returns a
            // root, simply do something like:
            // store.load(type, id, data.person)
            store.load(type, id, data);
        });
      }
  */
  find: null,

  serializer: DS.Serializer,

  registerTransform: function(attributeType, transform) {
    get(this, 'serializer').registerTransform(attributeType, transform);
  },

  /**
    If the globally unique IDs for your records should be generated on the client,
    implement the `generateIdForRecord()` method. This method will be invoked
    each time you create a new record, and the value returned from it will be
    assigned to the record's `primaryKey`.

    Most traditional REST-like HTTP APIs will not use this method. Instead, the ID
    of the record will be set by the server, and your adapter will update the store
    with the new ID when it calls `didCreateRecord()`. Only implement this method if
    you intend to generate record IDs on the client-side.

    The `generateIdForRecord()` method will be invoked with the requesting store as
    the first parameter and the newly created record as the second parameter:

        generateIdForRecord: function(store, record) {
          var uuid = App.generateUUIDWithStatisticallyLowOddsOfCollision();
          return uuid;
        }
  */
  generateIdForRecord: null,

  materialize: function(record, data) {
    get(this, 'serializer').materializeFromData(record, data);
  },

  toData: function(record, options) {
    return get(this, 'serializer').toData(record, options);
  },

  extractId: function(type, data) {
    return get(this, 'serializer').extractId(type, data);
  },

  extractEmbeddedData: function(store, type, data) {
    var serializer = get(this, 'serializer');

    type.eachAssociation(function(name, association) {
      var dataListToLoad, dataToLoad, typeToLoad;

      if (association.kind === 'hasMany') {
        this._extractEmbeddedHasMany(store, serializer, type, data, association);
      } else if (association.kind === 'belongsTo') {
        this._extractEmbeddedBelongsTo(store, serializer, type, data, association);
      }
    }, this);
  },

  _extractEmbeddedHasMany: function(store, serializer, type, data, association) {
    var dataListToLoad = serializer._extractEmbeddedHasMany(type, data, association.key),
        typeToLoad = association.type;

    if (dataListToLoad) {
      var ids = [];

      for (var i=0, l=dataListToLoad.length; i<l; i++) {
        var dataToLoad = dataListToLoad[i];
        ids.push(store.adapterForType(typeToLoad).extractId(typeToLoad, dataToLoad));
      }
      serializer.replaceEmbeddedHasMany(type, data, association.key, ids);
      store.loadMany(association.type, dataListToLoad);
    }
  },

  _extractEmbeddedBelongsTo: function(store, serializer, type, data, association) {
    var dataToLoad = serializer._extractEmbeddedBelongsTo(type, data, association.key),
        typeToLoad = association.type;

    if (dataToLoad) {
      var id = store.adapterForType(typeToLoad).extractId(typeToLoad, dataToLoad);
      serializer.replaceEmbeddedBelongsTo(type, data, association.key, id);
      store.load(association.type, dataToLoad);
    }
  },

  groupByType: function(enumerable) {
    var map = Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.OrderedSet.create(); }
    });

    enumerable.forEach(function(item) {
      map.get(item.constructor).add(item);
    });

    return map;
  },

  processRelationship: function(relationship) {
    // TODO: Track changes to relationships made after a
    // materialization request but before the adapter
    // responds. [tomhuda]
  },

  commit: function(store, commitDetails) {
    this.save(store, commitDetails);
  },

  save: function(store, commitDetails) {
    this.groupByType(commitDetails.created).forEach(function(type, set) {
      this.createRecords(store, type, set.copy());
    }, this);

    this.groupByType(commitDetails.updated).forEach(function(type, set) {
      this.updateRecords(store, type, set.copy());
    }, this);

    this.groupByType(commitDetails.deleted).forEach(function(type, set) {
      this.deleteRecords(store, type, set.copy());
    }, this);
  },

  createRecords: function(store, type, records) {
    records.forEach(function(record) {
      this.createRecord(store, type, record);
    }, this);
  },

  updateRecords: function(store, type, records) {
    records.forEach(function(record) {
      this.updateRecord(store, type, record);
    }, this);
  },

  deleteRecords: function(store, type, records) {
    records.forEach(function(record) {
      this.deleteRecord(store, type, record);
    }, this);
  },

  findMany: function(store, type, ids) {
    ids.forEach(function(id) {
      this.find(store, type, id);
    }, this);
  }
});

DS.Adapter.reopenClass({
  registerTransform: function(attributeType, transform) {
    var registeredTransforms = this._registeredTransforms || {};

    registeredTransforms[attributeType] = transform;

    this._registeredTransforms = registeredTransforms;
  },

  map: DS._Mappable.generateMapFunctionFor('attributes', function(key, newValue, map) {
    var existingValue = map.get(key);

    for (var prop in newValue) {
      if (!newValue.hasOwnProperty(prop)) { continue; }
      existingValue[prop] = newValue[prop];
    }
  }),

  resolveMapConflict: function(oldValue, newValue, mappingsKey) {
    for (var prop in oldValue) {
      if (!oldValue.hasOwnProperty(prop)) { continue; }
      newValue[prop] = oldValue[prop];
    }

    return newValue;
  }
});
