require('ember-data/serializers/json_serializer');

function loaderFor(store) {
  return {
    load: function(type, data, prematerialized) {
      return store.load(type, data, prematerialized);
    },

    loadMany: function(type, array) {
      return store.loadMany(type, array);
    },

    updateId: function(record, data) {
      return store.updateId(record, data);
    },

    populateArray: Ember.K,

    sideload: function(type, data) {
      return store.load(type, data);
    },

    sideloadMany: function(type, array) {
      return store.loadMany(type, array);
    },

    prematerialize: function(reference, prematerialized) {
      store.prematerialize(reference, prematerialized);
    },

    sinceForType: function(type, since) {
      store.sinceForType(type, since);
    }
  };
}

DS.loaderFor = loaderFor;

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
*/

var get = Ember.get, set = Ember.set, merge = Ember.merge;

DS.Adapter = Ember.Object.extend(DS._Mappable, {

  init: function() {
    var serializer = get(this, 'serializer');

    if (Ember.Object.detect(serializer)) {
      serializer = serializer.create();
      set(this, 'serializer', serializer);
    }

    this._attributesMap = this.createInstanceMapFor('attributes');
    this._configurationsMap = this.createInstanceMapFor('configurations');

    this._outstandingOperations = new Ember.MapWithDefault({
      defaultValue: function() { return 0; }
    });

    this._dependencies = new Ember.MapWithDefault({
      defaultValue: function() { return new Ember.OrderedSet(); }
    });

    this.registerSerializerTransforms(this.constructor, serializer, {});
    this.registerSerializerMappings(serializer);
  },

  /**
    Loads a payload for a record into the store.

    This method asks the serializer to break the payload into
    constituent parts, and then loads them into the store. For example,
    if you have a payload that contains embedded records, they will be
    extracted by the serializer and loaded into the store.

    For example:

    ```javascript
      adapter.load(store, App.Person, {
        id: 123,
        firstName: "Yehuda",
        lastName: "Katz",
        occupations: [{
          id: 345,
          title: "Tricycle Mechanic"
        }]    
      });
    ```

    This will load the payload for the `App.Person` with ID `123` and
    the embedded `App.Occupation` with ID `345`.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {any} payload
  */
  load: function(store, type, payload) {
    var loader = loaderFor(store);
    get(this, 'serializer').extractRecordRepresentation(loader, type, payload);
  },

  /**
    Acknowledges that the adapter has finished creating a record.

    Your adapter should call this method from `createRecord` when
    it has saved a new record to its persistent storage and received
    an acknowledgement.

    If the persistent storage returns a new payload in response to the
    creation, and you want to update the existing record with the
    new information, pass the payload as the fourth parameter.

    For example, the `RESTAdapter` saves newly created records by
    making an Ajax request. When the server returns, the adapter
    calls didCreateRecord. If the server returns a response body,
    it is passed as the payload. 

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {any} payload 
  */
  didCreateRecord: function(store, type, record, payload) {
    store.didSaveRecord(record);

    if (payload) {
      var loader = DS.loaderFor(store);

      loader.load = function(type, data, prematerialized) {
        store.updateId(record, data);
        return store.load(type, data, prematerialized);
      };

      get(this, 'serializer').extract(loader, payload, type);
    }
  },

  /**
    Acknowledges that the adapter has finished creating several records.

    Your adapter should call this method from `createRecords` when it
    has saved multiple created records to its persistent storage 
    received an acknowledgement.

    If the persistent storage returns a new payload in response to the
    creation, and you want to update the existing record with the
    new information, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {any} payload 
  */
  didCreateRecords: function(store, type, records, payload) {
    records.forEach(function(record) {
      store.didSaveRecord(record);
    }, this);

    if (payload) {
      var loader = DS.loaderFor(store);
      get(this, 'serializer').extractMany(loader, payload, type, records);
    }
  },

  /**
    @private

    Acknowledges that the adapter has finished updating or deleting a record.

    Your adapter should call this method from `updateRecord` or `deleteRecord`
    when it has updated or deleted a record to its persistent storage and
    received an acknowledgement.

    If the persistent storage returns a new payload in response to the
    update or delete, and you want to update the existing record with the
    new information, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {any} payload 
  */
  didSaveRecord: function(store, type, record, payload) {
    store.didSaveRecord(record);

    var serializer = get(this, 'serializer'),
        mappings = serializer.mappingForType(type);

    serializer.eachEmbeddedRecord(record, function(embeddedRecord, embeddedType) {
      if (embeddedType === 'load') { return; }

      this.didSaveRecord(store, embeddedRecord.constructor, embeddedRecord);
    }, this);

    if (payload) {
      var loader = DS.loaderFor(store);
      serializer.extract(loader, payload, type);
    }
  },

  /**
    Acknowledges that the adapter has finished updating a record.

    Your adapter should call this method from `updateRecord` when it
    has updated a record to its persistent storage and received an
    acknowledgement.

    If the persistent storage returns a new payload in response to the
    update, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {any} payload 
  */
  didUpdateRecord: function() {
    this.didSaveRecord.apply(this, arguments);
  },

  /**
    Acknowledges that the adapter has finished deleting a record.

    Your adapter should call this method from `deleteRecord` when it
    has deleted a record from its persistent storage and received an
    acknowledgement.

    If the persistent storage returns a new payload in response to the
    deletion, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {any} payload 
  */
  didDeleteRecord: function() {
    this.didSaveRecord.apply(this, arguments);
  },

  /**
    Acknowledges that the adapter has finished updating or deleting 
    multiple records.

    Your adapter should call this method from its `updateRecords` or
    `deleteRecords` when it has updated or deleted multiple records
    to its persistent storage and received an acknowledgement.

    If the persistent storage returns a new payload in response to the
    creation, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} records
    @param {any} payload 
  */
  didSaveRecords: function(store, type, records, payload) {
    records.forEach(function(record) {
      store.didSaveRecord(record);
    }, this);

    if (payload) {
      var loader = DS.loaderFor(store);
      get(this, 'serializer').extractMany(loader, payload, type);
    }
  },

  /**
    Acknowledges that the adapter has finished updating multiple records.

    Your adapter should call this method from its `updateRecords` when
    it has updated multiple records to its persistent storage and
    received an acknowledgement.

    If the persistent storage returns a new payload in response to the
    update, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} records
    @param {any} payload 
  */
  didUpdateRecords: function() {
    this.didSaveRecords.apply(this, arguments);
  },

  /**
    Acknowledges that the adapter has finished updating multiple records.

    Your adapter should call this method from its `deleteRecords` when
    it has deleted multiple records to its persistent storage and
    received an acknowledgement.

    If the persistent storage returns a new payload in response to the
    deletion, pass the payload as the fourth parameter.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} records
    @param {any} payload 
  */
  didDeleteRecords: function() {
    this.didSaveRecords.apply(this, arguments);
  },

  /**
    Loads the response to a request for a record by ID.

    Your adapter should call this method from its `find` method
    with the response from the backend.

    You should pass the same ID to this method that was given
    to your find method so that the store knows which record
    to associate the new data with.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {any} payload 
    @param {String} id
  */
  didFindRecord: function(store, type, payload, id) {
    var loader = DS.loaderFor(store);

    loader.load = function(type, data, prematerialized) {
      prematerialized = prematerialized || {};
      prematerialized.id = id;

      return store.load(type, data, prematerialized);
    };

    get(this, 'serializer').extract(loader, payload, type);
  },

  /**
    Loads the response to a request for all records by type.

    You adapter should call this method from its `findAll`
    method with the response from the backend.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {any} payload 
  */
  didFindAll: function(store, type, payload) {
    var loader = DS.loaderFor(store),
        serializer = get(this, 'serializer');

    store.didUpdateAll(type);

    serializer.extractMany(loader, payload, type);
  },

  /**
    Loads the response to a request for records by query.

    Your adapter should call this method from its `findQuery`
    method with the response from the backend.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {any} payload 
    @param {DS.AdapterPopulatedRecordArray} recordArray
  */
  didFindQuery: function(store, type, payload, recordArray) {
    var loader = DS.loaderFor(store);

    loader.populateArray = function(data) {
      recordArray.load(data);
    };

    get(this, 'serializer').extractMany(loader, payload, type);
  },

  /**
    Loads the response to a request for many records by ID.

    You adapter should call this method from its `findMany`
    method with the response from the backend.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {any} payload 
  */
  didFindMany: function(store, type, payload) {
    var loader = DS.loaderFor(store);

    get(this, 'serializer').extractMany(loader, payload, type);
  },

  /**
    Notifies the store that a request to the backend returned
    an error.

    Your adapter should call this method to indicate that the
    backend returned an error for a request.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
  */
  didError: function(store, type, record) {
    store.recordWasError(record);
  },

  dirtyRecordsForAttributeChange: function(dirtySet, record, attributeName, newValue, oldValue) {
    if (newValue !== oldValue) {
      // If this record is embedded, add its parent
      // to the dirty set.
      this.dirtyRecordsForRecordChange(dirtySet, record);
    }
  },

  dirtyRecordsForRecordChange: function(dirtySet, record) {
    dirtySet.add(record);
  },

  dirtyRecordsForBelongsToChange: function(dirtySet, child) {
    this.dirtyRecordsForRecordChange(dirtySet, child);
  },

  dirtyRecordsForHasManyChange: function(dirtySet, parent) {
    this.dirtyRecordsForRecordChange(dirtySet, parent);
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
    var mappings = this._attributesMap,
        configurations = this._configurationsMap;

    mappings.forEach(serializer.map, serializer);
    configurations.forEach(serializer.configure, serializer);
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

  serializer: DS.JSONSerializer,

  registerTransform: function(attributeType, transform) {
    get(this, 'serializer').registerTransform(attributeType, transform);
  },

  /**
    A public method that allows you to register an enumerated 
    type on your adapter.  This is useful if you want to utilize
    a text representation of an integer value.

    Eg: Say you want to utilize "low","medium","high" text strings
    in your app, but you want to persist those as 0,1,2 in your backend.
    You would first register the transform on your adapter instance:

    adapter.registerEnumTransform('priority', ['low', 'medium', 'high']);

    You would then refer to the 'priority' DS.attr in your model:
    App.Task = DS.Model.extend({
      priority: DS.attr('priority') 
    });

    And lastly, you would set/get the text representation on your model instance,
    but the transformed result will be the index number of the type.

    App:   myTask.get('priority') => 'low'
    Server Response / Load:  { myTask: {priority: 0} }

    @param {String} type of the transform
    @param {Array} array of String objects to use for the enumerated values.  
      This is an ordered list and the index values will be used for the transform.
  */
  registerEnumTransform: function(attributeType, objects) {
    get(this, 'serializer').registerEnumTransform(attributeType, objects);
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

  materialize: function(record, data, prematerialized) {
    get(this, 'serializer').materialize(record, data, prematerialized);
  },

  serialize: function(record, options) {
    return get(this, 'serializer').serialize(record, options);
  },

  extractId: function(type, data) {
    return get(this, 'serializer').extractId(type, data);
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
    this.save(store, commitDetails);
  },

  save: function(store, commitDetails) {
    var adapter = this;

    function filter(records) {
      var filteredSet = Ember.OrderedSet.create();

      records.forEach(function(record) {
        if (adapter.shouldSave(record)) {
          filteredSet.add(record);
        }
      });

      return filteredSet;
    }

    this.groupByType(commitDetails.created).forEach(function(type, set) {
      this.createRecords(store, type, filter(set));
    }, this);

    this.groupByType(commitDetails.updated).forEach(function(type, set) {
      this.updateRecords(store, type, filter(set));
    }, this);

    this.groupByType(commitDetails.deleted).forEach(function(type, set) {
      this.deleteRecords(store, type, filter(set));
    }, this);
  },

  shouldSave: Ember.K,

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

    merge(existingValue, newValue);
  }),

  configure: DS._Mappable.generateMapFunctionFor('configurations', function(key, newValue, map) {
    var existingValue = map.get(key);

    // If a mapping configuration is provided, peel it off and apply it
    // using the DS.Adapter.map API.
    var mappings = newValue && newValue.mappings;
    if (mappings) {
      this.map(key, mappings);
      delete newValue.mappings;
    }

    merge(existingValue, newValue);
  }),

  resolveMapConflict: function(oldValue, newValue, mappingsKey) {
    merge(newValue, oldValue);

    return newValue;
  }
});
