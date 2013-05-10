require('ember-data/serializers/json_serializer');

/**
  @module data
  @submodule data-adapter
*/

var get = Ember.get, set = Ember.set, merge = Ember.merge;

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

  For an example implementation, see {{#crossLink "DS.RestAdapter"}} the
  included REST adapter.{{/crossLink}}.
  
  @class Adapter
  @namespace DS
  @extends Ember.Object
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
    var extracted = get(this, 'serializer').extractRecordRepresentation(type, payload);
    return this.loadData(store, extracted);
  },

  loadMeta: function(store, extracted) {
    var meta = extracted.meta;
    for(var prop in meta) {
      if(!meta.hasOwnProperty(prop)) continue;
      store.metaForType(extracted.type, prop, meta[prop]);
    }
  },

  /**
    Loads all sideloaded records that are part of an
    extracted payload
  */
  sideload: function(store, extracted) {
    var sideloaded = extracted.sideloaded;
    if(sideloaded) {
      for(var i=0; i < sideloaded.length; i++) {
        this.loadData(store, sideloaded[i]);
      }
    }
  },

  /**
    Loads data into the store.
  */
  loadData: function(store, extracted) {
    var prematerialized = {};
    if(extracted.id) {
      prematerialized.id = extracted.id;
    }
    var reference = store.load(extracted.type, extracted.raw || {}, prematerialized);
    this.loadEmbedded(store, reference, extracted);
    return reference;
  },

  /**
    Updates the data in the store associated with
    a record that has already been materialized.
  */
  updateData: function(store, record, extracted) {
    var prematerialized = {};
    if(extracted.id) {
      prematerialized.id = extracted.id;
    }
    var reference = store.load(extracted.type, extracted.raw || {}, prematerialized);
    this.updateEmbedded(store, record, extracted);
    return reference;
  },

  /**
    Updates all embedded records for the given record and
    extracted payload.

    This method differs from the `load` counterpart in that
    it will invoke the appropriate lifecycle callbacks on
    records that are already materialized. If the records
    are not materialized, this method defers to the normal
    load methods.
  */
  updateEmbedded: function(store, record, extracted) {
    var name, value, cached;
    var reference = record.get('_reference');
    var prematerialized = reference.prematerialized;
    var hasMany = extracted.embeddedHasMany, belongsTo = extracted.embeddedBelongsTo;
    for(name in hasMany) {
      if(!hasMany.hasOwnProperty(name)) continue;
      value = hasMany[name];

      cached = record.cacheFor(name);
      if(cached) {
        prematerialized[name] = this.updateEmbeddedHasMany(store, record, value, name);
      } else {
        prematerialized[name] = this.loadEmbeddedHasMany(store, reference, value, name);
      }
    }

    for(name in belongsTo) {
      if(!belongsTo.hasOwnProperty(name)) continue;
      value = belongsTo[name];

      cached = record.cacheFor(name);
      if(cached) {
        prematerialized[name] = this.updateEmbeddedBelongsTo(store, record, value, name);
      } else {
        prematerialized[name] = this.loadEmbeddedBelongsTo(store, reference, value, name);
      }
    }
  },

  updateEmbeddedHasMany: function(store, parentRecord, resultArray, name) {
    // TODO: handle deletion
    // TODO: handle re-ordering

    var records = parentRecord.get(name).toArray();

    return resultArray.map(function(result, i) {
      var record = records[i];
      var root = get(this, 'serializer').rootForType(result.type);
      var raw = {};
      raw[root] = result.raw;
      if(get(record, 'isNew')) {
        this.didCreateRecord(store, record.constructor, record, raw);
      } else {
        this.didSaveRecord(store, record.constructor, record, raw);
      }
      return record.get('_reference');
    }, this);
  },

  updateEmbeddedBelongsTo: function(store, parentRecord, result, name) {
    // TODO: handle deletion

    var record = parentRecord.get(name);
    var root = get(this, 'serializer').rootForType(result.type);
    var raw = {};
    raw[root] = result.raw;
    if(get(record, 'isNew')) {
      this.didCreateRecord(store, record.constructor, record, raw);
    } else {
      this.didSaveRecord(store, record.constructor, record, raw);
    }
    return record.get('_reference');
  },

  loadEmbeddedHasMany: function(store, parentReference, resultsArray, name) {
    return resultsArray.map(function(result) {
      var childReference = this.load(store, result.type, result.raw);
      if (result.embeddedType === 'always') {
        childReference.parent = parentReference;
      }
      return childReference;
    }, this);
  },

  loadEmbeddedBelongsTo: function(store, parentReference, result, name) {
    var childReference = this.load(store, result.type, result.raw);
    if (result.embeddedType === 'always') {
      childReference.parent = parentReference;
    }
    return childReference;
  },

  /**
    Loads all embedded records for the given reference and
    extracted payload.
  */
  loadEmbedded: function(store, reference, extracted) {
    var name, value;
    var prematerialized = reference.prematerialized;
    var hasMany = extracted.embeddedHasMany, belongsTo = extracted.embeddedBelongsTo;
    for(name in hasMany) {
      if(!hasMany.hasOwnProperty(name)) continue;
      value = hasMany[name];

      prematerialized[name] = this.loadEmbeddedHasMany(store, reference, value, name);
    }

    for(name in belongsTo) {
      if(!belongsTo.hasOwnProperty(name)) continue;
      value = belongsTo[name];

      prematerialized[name] = this.loadEmbeddedBelongsTo(store, reference, value, name);
    }
  },

  /**
    Recursively invokes lifecycle callbacks on all embedded records.

    This method should only be called when an operation has
    completed and no payload is returned. Otherwise, the `updateEmbedded`
    method should be called.
  */
  notifyEmbedded: function(store, record) {
    var serializer = get(this, 'serializer');
    serializer.eachEmbeddedRecord(record, function(embeddedRecord, embeddedType) {
      if (embeddedType === 'load') { return; }
      this.didSaveRecord(store, embeddedRecord.constructor, embeddedRecord);
    }, this);
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
      var extracted = get(this, 'serializer').extract(type, payload);
      store.updateId(record, extracted.raw);
      this.loadMeta(store, extracted);
      this.sideload(store, extracted);
      this.updateData(store, record, extracted);
    } else {
      this.notifyEmbedded(store, record);
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
      if(!payload) {
        this.notifyEmbedded(store, record);
      }
    }, this);

    if (payload) {
      var extracted = get(this, 'serializer').extractMany(type, payload);
      this.loadMeta(store, extracted);
      this.sideload(store, extracted);
      records = records.toArray();
      for(var i=0; i < extracted.raw.length; i++) {
        store.updateId(records[i], extracted.raw[i].raw);
        this.updateData(store, records[i], extracted.raw[i]);
      }
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

    if (payload) {
      var extracted = get(this, 'serializer').extract(type, payload);
      this.loadMeta(store, extracted);
      this.sideload(store, extracted);
      this.updateData(store, record, extracted);
    } else {
      this.notifyEmbedded(store, record);
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
      if(!payload) {
        this.notifyEmbedded(store, record);
      }
    }, this);

    if (payload) {
      var extracted = get(this, 'serializer').extractMany(type, payload);
      this.loadMeta(store, extracted);
      this.sideload(store, extracted);
      records = records.toArray();
      for(var i=0; i < extracted.raw.length; i++) {
        this.updateData(store, records[i], extracted.raw[i]);
      }
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
    var extracted = get(this, 'serializer').extract(type, payload);
    extracted.id = id;
    this.loadMeta(store, extracted);
    this.sideload(store, extracted);
    this.loadData(store, extracted);
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
    store.didUpdateAll(type);
    var extracted = get(this, 'serializer').extractMany(type, payload);
    this.loadMeta(store, extracted);
    this.sideload(store, extracted);
    for(var i=0; i < extracted.raw.length; i++) {
      this.loadData(store, extracted.raw[i]);
    }
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
    var extracted = get(this, 'serializer').extractMany(type, payload);
    this.loadMeta(store, extracted);
    this.sideload(store, extracted);
    var references = [];
    for(var i=0; i < extracted.raw.length; i++) {
      references.push(this.loadData(store, extracted.raw[i]));
    }
    recordArray.load(references);
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
    var extracted = get(this, 'serializer').extractMany(type, payload);
    this.loadMeta(store, extracted);
    this.sideload(store, extracted);
    for(var i=0; i < extracted.raw.length; i++) {
      this.loadData(store, extracted.raw[i]);
    }
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

  registerEnumTransform: function(attributeType, objects) {
    var registeredEnumTransforms = this._registeredEnumTransforms || {};

    registeredEnumTransforms[attributeType] = objects;

    this._registeredEnumTransforms = registeredEnumTransforms;
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

  resolveMapConflict: function(oldValue, newValue) {
    merge(newValue, oldValue);

    return newValue;
  }
});
