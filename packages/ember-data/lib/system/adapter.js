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

DS.Adapter = Ember.Object.extend({

  init: function() {
    var serializer = get(this, 'serializer');

    if (Ember.Object.detect(serializer)) {
      serializer = serializer.create();
      set(this, 'serializer', serializer);
    }

    this.registerSerializerTransforms(this.constructor, serializer, {});
    this.registerSerializerMappings(this.constructor, serializer);
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
  registerSerializerMappings: function(klass, serializer) {
    var mappings = klass._registeredMappings, superclass, prop;

    if (superclass = klass.superclass) {
      this.registerSerializerMappings(superclass, serializer);
    }

    if (!mappings) { return; }

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
            // data is a Hash of key/value pairs. If your server returns a
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

  materialize: function(record, hash) {
    get(this, 'serializer').materializeFromJSON(record, hash);
  },

  toJSON: function(record, options) {
    return get(this, 'serializer').toJSON(record, options);
  },

  extractId: function(type, hash) {
    return get(this, 'serializer').extractId(type, hash);
  },

  shouldCommit: function(record) {
    return true;
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

  commit: function(store, commitDetails) {
    // nº1: determine which records the adapter actually l'cares about
    // nº2: for each relationship, give the adapter an opportunity to mark
    //      related records as l'pending
    // nº3: trigger l'save on l'non-pending records

    var updated = Ember.OrderedSet.create();
    commitDetails.updated.forEach(function(record) {
      var shouldCommit = this.shouldCommit(record);

      if (!shouldCommit) {
        store.didSaveRecord(record);
      } else {
        updated.add(record);
      }
    }, this);

    commitDetails.updated = updated;
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
  },

  materializeError: function(record, errorMessage, options) {
    options = options || {};
    options.message = errorMessage;
    return DS.AdapterError.create(options);
  },

  materializeValidationErrors: function(record, errorsHash) {
    var key, attribute, errors = [], messages,
        serializer = get(this, 'serializer');

    for (key in errorsHash) {
      if (errorsHash.hasOwnProperty(key)) {
        attribute = serializer.attributeNameForKey(record.constructor, key);
        if (attribute) {
          messages = Ember.makeArray(errorsHash[key]);
          for (var i = 0, l = messages.length; i < l; i++) {
            errors.push(DS.AdapterValidationError.create({
              message: messages[i],
              attribute: attribute
            }));
          }
        }
      }
    }

    return errors;
  }
});

DS.Adapter.reopenClass({
  registerTransform: function(attributeType, transform) {
    var registeredTransforms = this._registeredTransforms || {};

    registeredTransforms[attributeType] = transform;

    this._registeredTransforms = registeredTransforms;
  },

  map: function(type, mapping) {
    var mappings = this._registeredMappings || Ember.MapWithDefault.create({
      defaultValue: function() { return {}; }
    });
    var mappingsForType = mappings.get(type);

    for (var prop in mapping) {
      if (!mapping.hasOwnProperty(prop)) { continue; }
      mappingsForType[prop] = mapping[prop];
    }

    this._registeredMappings = mappings;
  }
});
