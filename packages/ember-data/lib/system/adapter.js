require('ember-data/serializers/json_serializer');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, merge = Ember.merge;
var forEach = Ember.EnumerableUtils.forEach;
var resolve = Ember.RSVP.resolve;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

DS.InvalidError = function(errors) {
  var tmp = Error.prototype.constructor.call(this, "The backend rejected the commit because it was invalid: " + Ember.inspect(errors));
  this.errors = errors;

  for (var i=0, l=errorProps.length; i<l; i++) {
    this[errorProps[i]] = tmp[errorProps[i]];
  }
};
DS.InvalidError.prototype = Ember.create(Error.prototype);

function isThenable(object) {
  return object && typeof object.then === 'function';
}

// Simple dispatcher to support overriding the aliased
// method in subclasses.
function aliasMethod(methodName) {
  return function() {
    return this[methodName].apply(this, arguments);
  };
}

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
    this._outstandingOperations = new Ember.MapWithDefault({
      defaultValue: function() { return 0; }
    });

    this._dependencies = new Ember.MapWithDefault({
      defaultValue: function() { return new Ember.OrderedSet(); }
    });
  },

  extract: function(store, type, payload, id, requestType) {
    var specificExtract = "extract" + requestType.charAt(0).toUpperCase() + requestType.substr(1);
    return this[specificExtract](store, type, payload, id, requestType);
  },

  extractFindAll: aliasMethod('extractArray'),
  extractFindQuery: aliasMethod('extractArray'),
  extractFindMany: aliasMethod('extractArray'),
  extractFindHasMany: aliasMethod('extractArray'),

  extractCreateRecord: aliasMethod('extractSave'),
  extractUpdateRecord: aliasMethod('extractSave'),
  extractDeleteRecord: aliasMethod('extractSave'),

  extractFind: aliasMethod('extractSingle'),
  extractSave: aliasMethod('extractSingle'),

  extractSingle: function(store, type, payload) {
    return payload;
  },

  extractArray: function(store, type, payload) {
    return payload;
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

  _find: function(store, type, id) {
    var promise = this.find(store, type, id),
        adapter = this;

    return resolve(promise).then(function(payload) {
      payload = adapter.extract(store, type, payload, id, 'find');
      return store.push(type, payload);
    });
  },

  /**
    Optional

    @method findAll
    @param  store
    @param  type
    @param  since
  */
  findAll: null,

  _findAll: function(store, type, since) {
    var promise = this.findAll(store, type, since),
        adapter = this;

    return resolve(promise).then(function(payload) {
      payload = adapter.extract(store, type, payload, null, 'findAll');

      store.pushMany(type, payload);
      store.didUpdateAll(type);
      return store.all(type);
    });
  },

  /**
    Optional

    @method findQuery
    @param  store
    @param  type
    @param  query
    @param  recordArray
  */
  findQuery: null,

  _findQuery: function(store, type, query, recordArray) {
    var promise = this.findQuery(store, type, query, recordArray),
        adapter = this;

    return resolve(promise).then(function(payload) {
      payload = adapter.extract(store, type, payload, null, 'findAll');

      recordArray.load(payload);
      return recordArray;
    });
  },

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
    return get(record, 'store').serializerFor(record.constructor).serialize(record, options);
  },

  /**
    Proxies to the serializer's `extractId` method.

    @method extractId
    @param {subclass of DS.Model} type  the model class
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
    @private

    This method calls a method (`createRecord`, `updateRecord` or `deleteRecord`)
    with the store, type, and record. That method will return a promise. When the
    promise is resolved, `_commitRecord` will call `store.didSaveRecord`.

    @method   _commitRecord
    @property {"createRecord"|"updateRecord"|"deleteRecord"} operation
    @property {DS.Store} store
    @property {subclass of DS.Model} type
    @property {DS.Model} record
    @return   {RSVP.Promise}
  **/
  _commitRecord: function(operation, store, type, record) {
    var promise = this[operation](store, type, record),
        adapter = this;

    Ember.assert("Your adapter's '" + operation + "' method must return a promise, but it returned " + promise, isThenable(promise));

    return promise.then(function(payload) {
      payload = adapter.extract(store, type, payload, get(record, 'id'), operation);
      store.didSaveRecord(record, payload);
    }, function(reason) {
      if (reason instanceof DS.InvalidError) {
        store.recordWasInvalid(record, reason.errors);
      } else {
        store.recordWasError(record, reason);
      }
    });
  },

  /**
    @private

    This method calls `createRecord` and delegates the handling of the
    returned promise to _commitRecord.

    @property {DS.Store} store
    @property {subclass of DS.Model} type
    @property {DS.Model} record
    @return   {RSVP.Promise}
  */
  _createRecord: function(store, type, record) {
    return this._commitRecord('createRecord', store, type, record);
  },

  /**
    Implement this method in a subclass to handle the creation of
    new records.

    Serializes the record and send it to the server.

    This implementation should call the adapter's `didCreateRecord`
    method on success or `didError` method on failure.

    @method createRecord
    @property {DS.Store} store
    @property {subclass of DS.Model} type   the DS.Model class of the record
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
    @property {subclass of DS.Model} type   the DS.Model class of the records
    @property {Array[DS.Model]} records
  */
  createRecords: function(store, type, records) {
    records.forEach(function(record) {
      this._createRecord(store, type, record);
    }, this);
  },

  /**
    @private

    This method calls `updateRecord` and delegates the handling of the
    returned promise to _commitRecord.

    @property {DS.Store} store
    @property {subclass of DS.Model} type
    @property {DS.Model} record
    @return   {RSVP.Promise}
  */
  _updateRecord: function(store, type, record) {
    return this._commitRecord('updateRecord', store, type, record);
  },

  /**
    Implement this method in a subclass to handle the updating of
    a record.

    Serializes the record update and send it to the server.

    @method updateRecord
    @property {DS.Store} store
    @property {subclass of DS.Model} type   the DS.Model class of the record
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
    @property {subclass of DS.Model} type   the DS.Model class of the records
    @property {Array[DS.Model]} records
  */
  updateRecords: function(store, type, records) {
    records.forEach(function(record) {
      this._updateRecord(store, type, record);
    }, this);
  },

  /**
    @private

    This method calls `deleteRecord` and delegates the handling of the
    returned promise to _commitRecord.

    @property {DS.Store} store
    @property {subclass of DS.Model} type
    @property {DS.Model} record
    @return   {RSVP.Promise}
  */
  _deleteRecord: function(store, type, record) {
    return this._commitRecord('deleteRecord', store, type, record);
  },

  /**
    Implement this method in a subclass to handle the deletion of
    a record.

    Sends a delete request for the record to the server.

    @method deleteRecord
    @property {DS.Store} store
    @property {subclass of DS.Model} type   the DS.Model class of the record
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
    @property {subclass of DS.Model} type   the DS.Model class of the records
    @property {Array[DS.Model]} records
  */
  deleteRecords: function(store, type, records) {
    records.forEach(function(record) {
      this._deleteRecord(store, type, record);
    }, this);
  },

  /**
    Find multiple records at once.

    By default, it loops over the provided ids and calls `find` on each.
    May be overwritten to improve performance and reduce the number of
    server requests.

    @method findMany
    @property {DS.Store} store
    @property {subclass of DS.Model} type   the DS.Model class of the records
    @property {Array}    ids
  */
  findMany: function(store, type, ids) {
    var promises = ids.map(function(id) {
      return this.find(store, type, id);
    }, this);

    return Ember.RSVP.all(promises);
  },

  _findMany: function(store, type, ids, owner) {
    var promise = this.findMany(store, type, ids, owner),
        adapter = this;

    return resolve(promise).then(function(payload) {
      payload = adapter.extract(store, type, payload, null, 'findMany');

      store.pushMany(type, payload);
    });
  },

  _findHasMany: function(store, record, link, relationship) {
    var promise = this.findHasMany(store, record, link, relationship),
        adapter = this;

    return resolve(promise).then(function(payload) {
      payload = adapter.extract(store, relationship.type, payload, null, 'findHasMany');

      var records = store.pushMany(relationship.type, payload);
      record.updateHasMany(relationship.key, records);
    });
  }
});
