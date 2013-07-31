require('ember-data/serializers/json_serializer');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, merge = Ember.merge;
var forEach = Ember.EnumerableUtils.forEach;

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
      return store.adapterForType(type).load(store, type, data);
    },

    sideloadMany: function(type, array) {
      return store.loadMany(type, array);
    },

    prematerialize: function(reference, prematerialized) {
      reference.prematerialized = prematerialized;
    },

    metaForType: function(type, property, data) {
      store.metaForType(type, property, data);
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

  For an example implementation, see `DS.RestAdapter`, the
  included REST adapter.

  @class Adapter
  @namespace DS
  @extends Ember.Object
  @uses DS._Mappable
*/

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

        adapter.load(store, App.Person, {
          id: 123,
          firstName: "Yehuda",
          lastName: "Katz",
          occupations: [{
            id: 345,
            title: "Tricycle Mechanic"
          }]
        });

    This will load the payload for the `App.Person` with ID `123` and
    the embedded `App.Occupation` with ID `345`.

    @method load
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {any} payload
  */
  load: function(store, type, payload) {
    var loader = loaderFor(store);
    return get(this, 'serializer').extractRecordRepresentation(loader, type, payload);
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

    @method didCreateRecord
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

    @method didCreateRecords
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

    @method didSaveRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {any} payload
  */
  didSaveRecord: function(store, type, record, payload) {
    store.didSaveRecord(record);

    var serializer = get(this, 'serializer');

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

    @method didUpdateRecord
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

    @method didDeleteRecord
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

    @method didSaveRecords
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

    @method didUpdateRecords
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

    @method didDeleteRecords
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

    @method didFindRecord
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

    @method didFindAll
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

    @method didFindQuery
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

    @method didFindMany
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

    @method didError
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
  */
  didError: function(store, type, record) {
    store.recordWasError(record);
  },

  /**
    @method dirtyRecordsForAttributeChange
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} record
    @param {String} attributeName
    @param {any} newValue
    @param {any} oldValue
  */
  dirtyRecordsForAttributeChange: function(dirtySet, record, attributeName, newValue, oldValue) {
    if (newValue !== oldValue) {
      // If this record is embedded, add its parent
      // to the dirty set.
      this.dirtyRecordsForRecordChange(dirtySet, record);
    }
  },

  /**
    @method dirtyRecordsForRecordChange
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} record
  */
  dirtyRecordsForRecordChange: function(dirtySet, record) {
    dirtySet.add(record);
  },

  /**
    @method dirtyRecordsForBelongsToChange
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} child
    @param {DS.RelationshipChange} relationship
  */
  dirtyRecordsForBelongsToChange: function(dirtySet, child) {
    this.dirtyRecordsForRecordChange(dirtySet, child);
  },

  /**
    @method dirtyRecordsForHasManyChange
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} parent
    @param {DS.RelationshipChange} relationship
  */
  dirtyRecordsForHasManyChange: function(dirtySet, parent, relationship) {
    this.dirtyRecordsForRecordChange(dirtySet, parent);
  },

  /**
    @private

    This method recursively climbs the superclass hierarchy and
    registers any class-registered transforms on the adapter's
    serializer.

    Once it registers a transform for a given type, it ignores
    subsequent transforms for the same attribute type.

    @method registerSerializerTransforms
    @param {Class} klass the DS.Adapter subclass to extract the
      transforms from
    @param {DS.Serializer} serializer the serializer to register
      the transforms onto
    @param {Object} seen a hash of attributes already seen
  */
  registerSerializerTransforms: function(klass, serializer, seen) {
    var transforms = klass._registeredTransforms, superclass, prop;
    var enumTransforms = klass._registeredEnumTransforms;

    for (prop in transforms) {
      if (!transforms.hasOwnProperty(prop) || prop in seen) { continue; }
      seen[prop] = true;

      serializer.registerTransform(prop, transforms[prop]);
    }

    for (prop in enumTransforms) {
      if (!enumTransforms.hasOwnProperty(prop) || prop in seen) { continue; }
      seen[prop] = true;

      serializer.registerEnumTransform(prop, enumTransforms[prop]);
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

    @method registerSerializerMappings
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

    @method find
  */
  find: Ember.required(Function),

  /**
    Optional

    @method findAll
    @param  store
    @param  type
    @param  since
  */
  findAll: null,

  /**
    Optional

    @method findQuery
    @param  store
    @param  type
    @param  query
    @param  recordArray
  */
  findQuery: null,

  /**
    The class of the serializer to be used by this adapter.

    @property serializer
    @type     DS.Serializer
    @default  DS.JSONSerializer
  */
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

    @method registerEnumTransform
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

    @method generateIdForRecord
    @param {DS.Store} store
    @param {DS.Model} record
  */
  generateIdForRecord: null,

  /**
    Proxies to the serializer's `materialize` method.

    @method materialize
    @param {DS.Model} record
    @param {Object}   data
    @param {Object}   prematerialized
  */
  materialize: function(record, data, prematerialized) {
    get(this, 'serializer').materialize(record, data, prematerialized);
  },

  /**
    Proxies to the serializer's `serialize` method.

    @method serialize
    @param {DS.Model} record
    @param {Object}   options
  */
  serialize: function(record, options) {
    return get(this, 'serializer').serialize(record, options);
  },

  /**
    Proxies to the serializer's `extractId` method.

    @method extractId
    @param {DS.Model} type  the model class
    @param {Object}   data
  */
  extractId: function(type, data) {
    return get(this, 'serializer').extractId(type, data);
  },

  /**
    @method groupByType
    @private
    @param  enumerable
  */
  groupByType: function(enumerable) {
    var map = Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.OrderedSet.create(); }
    });

    forEach(enumerable, function(item) {
      map.get(item.constructor).add(item);
    });

    return map;
  },

  /**
    The commit method is called when a transaction is being committed.
    The `commitDetails` is a map with each record type and a list of
    committed, updated and deleted records.

    By default, this just calls the adapter's `save` method.
    If you need more advanced handling of commits, e.g., only sending
    certain records to the server, you can overwrite this method.

    @method commit
    @params {DS.Store}  store
    @params {Ember.Map} commitDetails   see `DS.Transaction#commitDetails`.
  */
  commit: function(store, commitDetails) {
    this.save(store, commitDetails);
  },

  /**
    Iterates over each set of records provided in the commit details and
    filters with `DS.Adapter#shouldSave` and then calls `createRecords`,
    `updateRecords`, and `deleteRecords` for each set as approriate.

    @method save
    @params {DS.Store}  store
    @params {Ember.Map} commitDetails   see `DS.Transaction#commitDetails`.
  */
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

  /**
    Called on each record before saving. If false is returned, the record
    will not be saved.

    @method   shouldSave
    @property {DS.Model} record
    @return   {Boolean}  `true` to save, `false` to not. Defaults to true.
  */
  shouldSave: function(record) {
    return true;
  },

  /**
    Implement this method in a subclass to handle the creation of
    new records.

    Serializes the record and send it to the server.

    This implementation should call the adapter's `didCreateRecord`
    method on success or `didError` method on failure.

    @method createRecord
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the record
    @property {DS.Model} record
  */
  createRecord: Ember.required(Function),

  /**
    Creates multiple records at once.

    By default, it loops over the supplied array and calls `createRecord`
    on each. May be overwritten to improve performance and reduce the number
    of server requests.

    @method createRecords
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the records
    @property {Array[DS.Model]} records
  */
  createRecords: function(store, type, records) {
    records.forEach(function(record) {
      this.createRecord(store, type, record);
    }, this);
  },

  /**
    Implement this method in a subclass to handle the updating of
    a record.

    Serializes the record update and send it to the server.

    @method updateRecord
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the record
    @property {DS.Model} record
  */
  updateRecord: Ember.required(Function),

  /**
    Updates multiple records at once.

    By default, it loops over the supplied array and calls `updateRecord`
    on each. May be overwritten to improve performance and reduce the number
    of server requests.

    @method updateRecords
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the records
    @property {Array[DS.Model]} records
  */
  updateRecords: function(store, type, records) {
    records.forEach(function(record) {
      this.updateRecord(store, type, record);
    }, this);
  },

  /**
    Implement this method in a subclass to handle the deletion of
    a record.

    Sends a delete request for the record to the server.

    @method deleteRecord
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the record
    @property {DS.Model} record
  */
  deleteRecord: Ember.required(Function),

  /**
    Delete multiple records at once.

    By default, it loops over the supplied array and calls `deleteRecord`
    on each. May be overwritten to improve performance and reduce the number
    of server requests.

    @method deleteRecords
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the records
    @property {Array[DS.Model]} records
  */
  deleteRecords: function(store, type, records) {
    records.forEach(function(record) {
      this.deleteRecord(store, type, record);
    }, this);
  },

  /**
    Find multiple records at once.

    By default, it loops over the provided ids and calls `find` on each.
    May be overwritten to improve performance and reduce the number of
    server requests.

    @method findMany
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the records
    @property {Array}    ids
  */
  findMany: function(store, type, ids) {
    ids.forEach(function(id) {
      this.find(store, type, id);
    }, this);
  }
});

DS.Adapter.reopenClass({

  /**
    Registers a custom attribute transform for the adapter class

    The `transform` property is an object with a `serialize` and
    `deserialize` property. These are each functions that respectively
    serialize the data to send to the backend or deserialize it for
    use on the client.

    @method registerTransform
    @static
    @property {DS.String} attributeType
    @property {Object}    transform
  */
  registerTransform: function(attributeType, transform) {
    var registeredTransforms = this._registeredTransforms || {};

    registeredTransforms[attributeType] = transform;

    this._registeredTransforms = registeredTransforms;
  },

  /**
    Registers a custom enumerable transform for the adapter class

    @method registerEnumTransform
    @static
    @property {DS.String} attributeType
    @property objects
  */
  registerEnumTransform: function(attributeType, objects) {
    var registeredEnumTransforms = this._registeredEnumTransforms || {};

    registeredEnumTransforms[attributeType] = objects;

    this._registeredEnumTransforms = registeredEnumTransforms;
  },

  /**
    Set adapter attributes for a DS.Model class.

    @method map
    @static
    @property {DS.Model} type   the DS.Model class
    @property {Object}   attributes
  */
  map: DS._Mappable.generateMapFunctionFor('attributes', function(key, newValue, map) {
    var existingValue = map.get(key);

    merge(existingValue, newValue);
  }),

  /**
    Set configuration options for a DS.Model class.

    @method configure
    @static
    @property {DS.Model} type   the DS.Model class
    @property {Object}   configuration
  */
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

  /**
    Resolved conflicts in configuration settings.

    Calls `Ember.merge` by default.

    @method resolveMapConflict
    @static
    @property oldValue
    @property newValue
  */
  resolveMapConflict: function(oldValue, newValue) {
    merge(newValue, oldValue);

    return newValue;
  }
});
