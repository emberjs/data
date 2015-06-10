/*globals Ember*/
/*jshint eqnull:true*/

/**
  @module ember-data
*/

import normalizeModelName from "ember-data/system/normalize-model-name";
import {
  InvalidError
} from "ember-data/system/adapter";
import {
  Map
} from "ember-data/system/map";

import {
  promiseArray,
  promiseObject
} from "ember-data/system/promise-proxies";

import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/system/store/common";

import {
  convertResourceObject,
  normalizeResponseHelper,
  pushPayload
} from "ember-data/system/store/serializer-response";

import {
  serializerForAdapter
} from "ember-data/system/store/serializers";

import {
  _find,
  _findMany,
  _findHasMany,
  _findBelongsTo,
  _findAll,
  _query
} from "ember-data/system/store/finders";

import coerceId from "ember-data/system/coerce-id";

import RecordArrayManager from "ember-data/system/record-array-manager";
import ContainerInstanceCache from 'ember-data/system/store/container-instance-cache';

import InternalModel from "ember-data/system/model/internal-model";
import Model from "ember-data/system/model";

var Backburner = Ember._Backburner || Ember.Backburner || Ember.__loader.require('backburner')['default'] || Ember.__loader.require('backburner')['Backburner'];

//Shim Backburner.join
if (!Backburner.prototype.join) {
  var isString = function(suspect) {
    return typeof suspect === 'string';
  };

  Backburner.prototype.join = function(/*target, method, args */) {
    var method, target;

    if (this.currentInstance) {
      var length = arguments.length;
      if (length === 1) {
        method = arguments[0];
        target = null;
      } else {
        target = arguments[0];
        method = arguments[1];
      }

      if (isString(method)) {
        method = target[method];
      }

      if (length === 1) {
        return method();
      } else if (length === 2) {
        return method.call(target);
      } else {
        var args = new Array(length - 2);
        for (var i =0, l = length - 2; i < l; i++) {
          args[i] = arguments[i + 2];
        }
        return method.apply(target, args);
      }
    } else {
      return this.run.apply(this, arguments);
    }
  };
}


//Get the materialized model from the internalModel/promise that returns
//an internal model and return it in a promiseObject. Useful for returning
//from find methods
function promiseRecord(internalModel, label) {
  //TODO cleanup
  var toReturn = internalModel;
  if (!internalModel.then) {
    toReturn = internalModel.getRecord();
  } else {
    toReturn = internalModel.then((model) => model.getRecord());
  }
  return promiseObject(toReturn, label);
}

var get = Ember.get;
var set = Ember.set;
var once = Ember.run.once;
var isNone = Ember.isNone;
var forEach = Ember.EnumerableUtils.forEach;
var indexOf = Ember.EnumerableUtils.indexOf;
var map = Ember.EnumerableUtils.map;
var Promise = Ember.RSVP.Promise;
var copy = Ember.copy;
var Store;

var Service = Ember.Service;
if (!Service) {
  Service = Ember.Object;
}

// Implementors Note:
//
//   The variables in this file are consistently named according to the following
//   scheme:
//
//   * +id+ means an identifier managed by an external source, provided inside
//     the data provided by that source. These are always coerced to be strings
//     before being used internally.
//   * +clientId+ means a transient numerical identifier generated at runtime by
//     the data store. It is important primarily because newly created objects may
//     not yet have an externally generated id.
//   * +internalModel+ means a record internalModel object, which holds metadata about a
//     record, even if it has not yet been fully materialized.
//   * +type+ means a DS.Model.

/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of `DS.Model` that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Define your application's store like this:

  ```app/stores/application.js
  import DS from 'ember-data';

  export default DS.Store.extend({
  });
  ```

  Most Ember.js applications will only have a single `DS.Store` that is
  automatically created by their `Ember.Application`.

  You can retrieve models from the store in several ways. To retrieve a record
  for a specific id, use `DS.Store`'s `find()` method:

  ```javascript
  store.find('person', 123).then(function (person) {
  });
  ```

  By default, the store will talk to your backend using a standard
  REST mechanism. You can customize how the store talks to your
  backend by specifying a custom adapter:

  ```app/adapters/application.js
  import DS from 'ember-data';

  export default DS.Adapter.extend({
  });
  ```

  You can learn more about writing a custom adapter by reading the `DS.Adapter`
  documentation.

  ### Store createRecord() vs. push() vs. pushPayload()

  The store provides multiple ways to create new record objects. They have
  some subtle differences in their use which are detailed below:

  [createRecord](#method_createRecord) is used for creating new
  records on the client side. This will return a new record in the
  `created.uncommitted` state. In order to persist this record to the
  backend you will need to call `record.save()`.

  [push](#method_push) is used to notify Ember Data's store of new or
  updated records that exist in the backend. This will return a record
  in the `loaded.saved` state. The primary use-case for `store#push` is
  to notify Ember Data about record updates (full or partial) that happen
  outside of the normal adapter methods (for example
  [SSE](http://dev.w3.org/html5/eventsource/) or [Web
  Sockets](http://www.w3.org/TR/2009/WD-websockets-20091222/)).

  [pushPayload](#method_pushPayload) is a convenience wrapper for
  `store#push` that will deserialize payloads if the
  Serializer implements a `pushPayload` method.

  Note: When creating a new record using any of the above methods
  Ember Data will update `DS.RecordArray`s such as those returned by
  `store#peekAll()`, `store#findAll()` or `store#filter()`. This means any
  data bindings or computed properties that depend on the RecordArray
  will automatically be synced to include the new or updated record
  values.

  @class Store
  @namespace DS
  @extends Ember.Service
*/
Store = Service.extend({

  /**
    @method init
    @private
  */
  init: function() {
    this._backburner = new Backburner(['normalizeRelationships', 'syncRelationships', 'finished']);
    // internal bookkeeping; not observable
    this.typeMaps = {};
    this.recordArrayManager = RecordArrayManager.create({
      store: this
    });
    this._pendingSave = [];
    this._instanceCache = new ContainerInstanceCache(this.container);
    //Used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = Map.create();
  },

  /**
    The adapter to use to communicate to a backend server or other persistence layer.

    This can be specified as an instance, class, or string.

    If you want to specify `app/adapters/custom.js` as a string, do:

    ```js
    adapter: 'custom'
    ```

    @property adapter
    @default DS.RESTAdapter
    @type {(DS.Adapter|String)}
  */
  adapter: '-rest',

  /**
    Returns a JSON representation of the record using a custom
    type-specific serializer, if one exists.

    The available options are:

    * `includeId`: `true` if the record's ID should be included in
      the JSON representation

    @method serialize
    @private
    @param {DS.Model} record the record to serialize
    @param {Object} options an options hash
  */
  serialize: function(record, options) {
    var snapshot = record._internalModel.createSnapshot();
    return snapshot.serialize(options);
  },

  /**
    This property returns the adapter, after resolving a possible
    string key.

    If the supplied `adapter` was a class, or a String property
    path resolved to a class, this property will instantiate the
    class.

    This property is cacheable, so the same instance of a specified
    adapter class should be used for the lifetime of the store.

    @property defaultAdapter
    @private
    @return DS.Adapter
  */
  defaultAdapter: Ember.computed('adapter', function() {
    var adapter = get(this, 'adapter');

    Ember.assert('You tried to set `adapter` property to an instance of `DS.Adapter`, where it should be a name', typeof adapter === 'string');

    adapter = this.retrieveManagedInstance('adapter', adapter);

    return adapter;
  }),

  // .....................
  // . CREATE NEW RECORD .
  // .....................

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    To create a new instance of `App.Post`:

    ```js
    store.createRecord('post', {
      title: "Rails is omakase"
    });
    ```

    @method createRecord
    @param {String} modelName
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {DS.Model} record
  */
  createRecord: function(modelName, inputProperties) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);
    var properties = copy(inputProperties) || Ember.create(null);

    // If the passed properties do not include a primary key,
    // give the adapter an opportunity to generate one. Typically,
    // client-side ID generators will use something like uuid.js
    // to avoid conflicts.

    if (isNone(properties.id)) {
      properties.id = this._generateId(modelName, properties);
    }

    // Coerce ID to a string
    properties.id = coerceId(properties.id);

    var internalModel = this.buildInternalModel(typeClass, properties.id);
    var record = internalModel.getRecord();

    // Move the record out of its initial `empty` state into
    // the `loaded` state.
    internalModel.loadedData();

    // Set the properties specified on the record.
    record.setProperties(properties);

    internalModel.eachRelationship(function(key, descriptor) {
      internalModel._relationships.get(key).setHasData(true);
    });

    return record;
  },

  /**
    If possible, this method asks the adapter to generate an ID for
    a newly created record.

    @method _generateId
    @private
    @param {String} modelName
    @param {Object} properties from the new record
    @return {String} if the adapter can generate one, an ID
  */
  _generateId: function(modelName, properties) {
    var adapter = this.adapterFor(modelName);

    if (adapter && adapter.generateIdForRecord) {
      return adapter.generateIdForRecord(this, modelName, properties);
    }

    return null;
  },

  // .................
  // . DELETE RECORD .
  // .................

  /**
    For symmetry, a record can be deleted via the store.

    Example

    ```javascript
    var post = store.createRecord('post', {
      title: "Rails is omakase"
    });

    store.deleteRecord(post);
    ```

    @method deleteRecord
    @param {DS.Model} record
  */
  deleteRecord: function(record) {
    record.deleteRecord();
  },

  /**
    For symmetry, a record can be unloaded via the store. Only
    non-dirty records can be unloaded.

    Example

    ```javascript
    store.find('post', 1).then(function(post) {
      store.unloadRecord(post);
    });
    ```

    @method unloadRecord
    @param {DS.Model} record
  */
  unloadRecord: function(record) {
    record.unloadRecord();
  },

  // ................
  // . FIND RECORDS .
  // ................

  /**
    This is the main entry point into finding records. The first parameter to
    this method is the model's name as a string.

    ---

    To find a record by ID, pass the `id` as the second parameter:

    ```javascript
    store.find('person', 1);
    ```

    The `find` method will always return a **promise** that will be resolved
    with the record. If the record was already in the store, the promise will
    be resolved immediately. Otherwise, the store will ask the adapter's `find`
    method to find the necessary data.

    The `find` method will always resolve its promise with the same object for
    a given type and `id`.

    ---

    You can optionally `preload` specific attributes and relationships that you know of
    by passing them as the third argument to find.

    For example, if your Ember route looks like `/posts/1/comments/2` and your API route
    for the comment also looks like `/posts/1/comments/2` if you want to fetch the comment
    without fetching the post you can pass in the post to the `find` call:

    ```javascript
    store.find('comment', 2, { preload: { post: 1 } });
    ```

    If you have access to the post model you can also pass the model itself:

    ```javascript
    store.find('post', 1).then(function (myPostModel) {
      store.find('comment', 2, {post: myPostModel});
    });
    ```

    This way, your adapter's `find` or `buildURL` method will be able to look up the
    relationship on the record and construct the nested URL without having to first
    fetch the post.

    ---

    To find all records for a type, call `findAll`:

    ```javascript
    store.findAll('person');
    ```

    This will ask the adapter's `findAll` method to find the records for the
    given type, and return a promise that will be resolved once the server
    returns the values. The promise will resolve into all records of this type
    present in the store, even if the server only returns a subset of them.

    @method find
    @param {String} modelName
    @param {(Object|String|Integer|null)} id
    @param {Object} options
    @return {Promise} promise
  */
  find: function(modelName, id, preload) {
    Ember.assert("You need to pass a type to the store's find method", arguments.length >= 1);
    Ember.assert("You may not pass `" + id + "` as id to the store's find method", arguments.length === 1 || !Ember.isNone(id));
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');

    if (arguments.length === 1) {
      Ember.deprecate('Using store.find(type) has been deprecated. Use store.findAll(type) to retrieve all records for a given type.');
      return this.findAll(modelName);
    }

    // We are passed a query instead of an id.
    if (Ember.typeOf(id) === 'object') {
      Ember.deprecate('Calling store.find() with a query object is deprecated. Use store.query() instead.');
      return this.query(modelName, id);
    }
    var options = deprecatePreload(preload, this.modelFor(modelName), 'find');
    return this.findRecord(modelName, coerceId(id), options);
  },

  /**
    This method returns a fresh record for a given type and id combination.

    If a record is available for the given type/id combination, then
    it will fetch this record from the store and call `reload()` on it.
    That will fire a request to server and return a promise that will
    resolve once the record has been reloaded.
    If there's no record corresponding in the store it will simply call
    `store.find`.

    Example

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
        return this.store.fetchById('post', params.post_id);
      }
    });
    ```

    @method fetchById
    @param {String} modelName
    @param {(String|Integer)} id
    @param {Object} options
    @return {Promise} promise
  */
  fetchById: function(modelName, id, preload) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var options = deprecatePreload(preload, this.modelFor(modelName), 'fetchById');
    if (this.hasRecordForId(modelName, id)) {
      return this.peekRecord(modelName, id).reload();
    } else {
      return this.findRecord(modelName, id, options);
    }
  },

  /**
    This method returns a fresh collection from the server, regardless of if there is already records
    in the store or not.

    @method fetchAll
    @param {String} modelName
    @return {Promise} promise
  */
  fetchAll: function(modelName) {
    Ember.deprecate('Using store.fetchAll(type) has been deprecated. Use store.findAll(type) to retrieve all records for a given type.');
    return this.findAll(modelName);
  },

  /**
    @method fetch
    @param {String} modelName
    @param {(String|Integer)} id
    @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
    @return {Promise} promise
    @deprecated Use [fetchById](#method_fetchById) instead
  */
  fetch: function(modelName, id, preload) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    Ember.deprecate('Using store.fetch() has been deprecated. Use store.fetchById for fetching individual records or store.fetchAll for collections');
    return this.fetchById(modelName, id, preload);
  },

  /**
    This method returns a record for a given type and id combination.

    @method findById
    @private
    @param {String} modelName
    @param {(String|Integer)} id
    @param {Object} options
    @return {Promise} promise
  */
  findById: function(modelName, id, preload) {
    Ember.deprecate('Using store.findById() has been deprecated. Use store.findRecord() to return a record for a given type and id combination.');
    var options = deprecatePreload(preload, this.modelFor(modelName), 'findById');
    return this.findRecord(modelName, id, options);
  },

  /**
    This method returns a record for a given type and id combination.

    @method findRecord
    @param {String} modelName
    @param {(String|Integer)} id
    @param {Object} options
    @return {Promise} promise
  */
  findRecord: function(modelName, id, options) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var internalModel = this._internalModelForId(modelName, id);

    return this._findByInternalModel(internalModel, options);
  },

  _findByInternalModel: function(internalModel, options) {
    var fetchedInternalModel;
    options = options || {};


    if (options.preload) {
      internalModel._preloadData(options.preload);
    }

    if (internalModel.isEmpty()) {
      fetchedInternalModel = this.scheduleFetch(internalModel);
      //TODO double check about reloading
    } else if (internalModel.isLoading()) {
      fetchedInternalModel = internalModel._loadingPromise;
    }

    return promiseRecord(fetchedInternalModel || internalModel, "DS: Store#findRecord " + internalModel.typeKey + " with id: " + get(internalModel, 'id'));
  },
  /**
    This method makes a series of requests to the adapter's `find` method
    and returns a promise that resolves once they are all loaded.

    @private
    @method findByIds
    @param {String} modelName
    @param {Array} ids
    @return {Promise} promise
  */
  findByIds: function(modelName, ids) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var store = this;

    return promiseArray(Ember.RSVP.all(map(ids, function(id) {
      return store.findRecord(modelName, id);
    })).then(Ember.A, null, "DS: Store#findByIds of " + modelName + " complete"));
  },

  /**
    This method is called by `findRecord` if it discovers that a particular
    type/id pair hasn't been loaded yet to kick off a request to the
    adapter.

    @method fetchRecord
    @private
    @param {InternalModel} internalModel model
    @return {Promise} promise
  */
  fetchRecord: function(internalModel) {
    var typeClass = internalModel.type;
    var id = internalModel.id;
    var adapter = this.adapterFor(typeClass.modelName);

    Ember.assert("You tried to find a record but you have no adapter (for " + typeClass + ")", adapter);
    Ember.assert("You tried to find a record but your adapter (for " + typeClass + ") does not implement 'find'", typeof adapter.find === 'function');

    var promise = _find(adapter, this, typeClass, id, internalModel);
    return promise;
  },

  scheduleFetchMany: function(records) {
    var internalModels = map(records, function(record) { return record._internalModel; });
    return Promise.all(map(internalModels, this.scheduleFetch, this));
  },

  scheduleFetch: function(internalModel) {
    var typeClass = internalModel.type;

    if (internalModel._loadingPromise) { return internalModel._loadingPromise; }

    var resolver = Ember.RSVP.defer('Fetching ' + typeClass + 'with id: ' + internalModel.id);
    var recordResolverPair = {
      record: internalModel,
      resolver: resolver
    };
    var promise = resolver.promise;

    internalModel.loadingData(promise);

    if (!this._pendingFetch.get(typeClass)) {
      this._pendingFetch.set(typeClass, [recordResolverPair]);
    } else {
      this._pendingFetch.get(typeClass).push(recordResolverPair);
    }
    Ember.run.scheduleOnce('afterRender', this, this.flushAllPendingFetches);

    return promise;
  },

  flushAllPendingFetches: function() {
    if (this.isDestroyed || this.isDestroying) {
      return;
    }

    this._pendingFetch.forEach(this._flushPendingFetchForType, this);
    this._pendingFetch = Map.create();
  },

  _flushPendingFetchForType: function (recordResolverPairs, typeClass) {
    var store = this;
    var adapter = store.adapterFor(typeClass.modelName);
    var shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    var records = Ember.A(recordResolverPairs).mapBy('record');

    function _fetchRecord(recordResolverPair) {
      recordResolverPair.resolver.resolve(store.fetchRecord(recordResolverPair.record));
    }

    function resolveFoundRecords(records) {
      forEach(records, function(record) {
        var pair = Ember.A(recordResolverPairs).findBy('record', record);
        if (pair) {
          var resolver = pair.resolver;
          resolver.resolve(record);
        }
      });
      return records;
    }

    function makeMissingRecordsRejector(requestedRecords) {
      return function rejectMissingRecords(resolvedRecords) {
        resolvedRecords = Ember.A(resolvedRecords);
        var missingRecords = requestedRecords.reject(function(record) {
          return resolvedRecords.contains(record);
        });
        if (missingRecords.length) {
          Ember.warn('Ember Data expected to find records with the following ids in the adapter response but they were missing: ' + Ember.inspect(Ember.A(missingRecords).mapBy('id')), false);
        }
        rejectRecords(missingRecords);
      };
    }

    function makeRecordsRejector(records) {
      return function (error) {
        rejectRecords(records, error);
      };
    }

    function rejectRecords(records, error) {
      forEach(records, function(record) {
        var pair = Ember.A(recordResolverPairs).findBy('record', record);
        if (pair) {
          var resolver = pair.resolver;
          resolver.reject(error);
        }
      });
    }

    if (recordResolverPairs.length === 1) {
      _fetchRecord(recordResolverPairs[0]);
    } else if (shouldCoalesce) {

      // TODO: Improve records => snapshots => records => snapshots
      //
      // We want to provide records to all store methods and snapshots to all
      // adapter methods. To make sure we're doing that we're providing an array
      // of snapshots to adapter.groupRecordsForFindMany(), which in turn will
      // return grouped snapshots instead of grouped records.
      //
      // But since the _findMany() finder is a store method we need to get the
      // records from the grouped snapshots even though the _findMany() finder
      // will once again convert the records to snapshots for adapter.findMany()

      var snapshots = Ember.A(records).invoke('createSnapshot');
      var groups = adapter.groupRecordsForFindMany(this, snapshots);
      forEach(groups, function (groupOfSnapshots) {
        var groupOfRecords = Ember.A(groupOfSnapshots).mapBy('_internalModel');
        var requestedRecords = Ember.A(groupOfRecords);
        var ids = requestedRecords.mapBy('id');
        if (ids.length > 1) {
          _findMany(adapter, store, typeClass, ids, requestedRecords).
            then(resolveFoundRecords).
            then(makeMissingRecordsRejector(requestedRecords)).
            then(null, makeRecordsRejector(requestedRecords));
        } else if (ids.length === 1) {
          var pair = Ember.A(recordResolverPairs).findBy('record', groupOfRecords[0]);
          _fetchRecord(pair);
        } else {
          Ember.assert("You cannot return an empty array from adapter's method groupRecordsForFindMany", false);
        }
      });
    } else {
      forEach(recordResolverPairs, _fetchRecord);
    }
  },

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it is available in the store,
    otherwise it will return `null`. A record is available if it has been fetched earlier, or
    pushed manually into the store.

    _Note: This is an synchronous method and does not return a promise._

    ```js
    var post = store.getById('post', 1);

    post.get('id'); // 1
    ```

    @method getById
    @param {String} modelName
    @param {String|Integer} id
    @return {DS.Model|null} record
  */
  getById: function(modelName, id) {
    Ember.deprecate('Using store.getById() has been deprecated. Use store.peekRecord to get a record by a given type and ID without triggering a fetch.');
    return this.peekRecord(modelName, id);
  },

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it is available in the store,
    otherwise it will return `null`. A record is available if it has been fetched earlier, or
    pushed manually into the store.

    _Note: This is an synchronous method and does not return a promise._

    ```js
    var post = store.peekRecord('post', 1);

    post.get('id'); // 1
    ```

    @method peekRecord
    @param {String} modelName
    @param {String|Integer} id
    @return {DS.Model|null} record
  */
  peekRecord: function(modelName, id) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    if (this.hasRecordForId(modelName, id)) {
      return this._internalModelForId(modelName, id).getRecord();
    } else {
      return null;
    }
  },

  /**
    This method is called by the record's `reload` method.

    This method calls the adapter's `find` method, which returns a promise. When
    **that** promise resolves, `reloadRecord` will resolve the promise returned
    by the record's `reload`.

    @method reloadRecord
    @private
    @param {DS.Model} internalModel
    @return {Promise} promise
  */
  reloadRecord: function(internalModel) {
    var modelName = internalModel.type.modelName;
    var adapter = this.adapterFor(modelName);
    var id = internalModel.id;

    Ember.assert("You cannot reload a record without an ID", id);
    Ember.assert("You tried to reload a record but you have no adapter (for " + modelName + ")", adapter);
    Ember.assert("You tried to reload a record but your adapter does not implement `find`", typeof adapter.find === 'function');

    return this.scheduleFetch(internalModel);
  },

  /**
    Returns true if a record for a given type and ID is already loaded.

    @method hasRecordForId
    @param {(String|DS.Model)} modelName
    @param {(String|Integer)} inputId
    @return {Boolean}
  */
  hasRecordForId: function(modelName, inputId) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);
    var id = coerceId(inputId);
    var internalModel = this.typeMapFor(typeClass).idToRecord[id];
    return !!internalModel && internalModel.isLoaded();
  },

  /**
    Returns id record for a given type and ID. If one isn't already loaded,
    it builds a new record and leaves it in the `empty` state.

    @method recordForId
    @private
    @param {String} modelName
    @param {(String|Integer)} id
    @return {DS.Model} record
  */
  recordForId: function(modelName, id) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    return this._internalModelForId(modelName, id).getRecord();
  },

  _internalModelForId: function(typeName, inputId) {
    var typeClass = this.modelFor(typeName);
    var id = coerceId(inputId);
    var idToRecord = this.typeMapFor(typeClass).idToRecord;
    var record = idToRecord[id];

    if (!record || !idToRecord[id]) {
      record = this.buildInternalModel(typeClass, id);
    }

    return record;
  },



  /**
    @method findMany
    @private
    @param {Array} internalModels
    @return {Promise} promise
  */
  findMany: function(internalModels) {
    var store = this;
    return Promise.all(map(internalModels, function(internalModel) {
      return store._findByInternalModel(internalModel);
    }));
  },


  /**
    If a relationship was originally populated by the adapter as a link
    (as opposed to a list of IDs), this method is called when the
    relationship is fetched.

    The link (which is usually a URL) is passed through unchanged, so the
    adapter can make whatever request it wants.

    The usual use-case is for the server to register a URL as a link, and
    then use that URL in the future to make a request for the relationship.

    @method findHasMany
    @private
    @param {DS.Model} owner
    @param {any} link
    @param {(Relationship)} relationship
    @return {Promise} promise
  */
  findHasMany: function(owner, link, relationship) {
    var adapter = this.adapterFor(owner.type.modelName);

    Ember.assert("You tried to load a hasMany relationship but you have no adapter (for " + owner.type + ")", adapter);
    Ember.assert("You tried to load a hasMany relationship from a specified `link` in the original payload but your adapter does not implement `findHasMany`", typeof adapter.findHasMany === 'function');

    return _findHasMany(adapter, this, owner, link, relationship);
  },

  /**
    @method findBelongsTo
    @private
    @param {DS.Model} owner
    @param {any} link
    @param {Relationship} relationship
    @return {Promise} promise
  */
  findBelongsTo: function(owner, link, relationship) {
    var adapter = this.adapterFor(owner.type.modelName);

    Ember.assert("You tried to load a belongsTo relationship but you have no adapter (for " + owner.type + ")", adapter);
    Ember.assert("You tried to load a belongsTo relationship from a specified `link` in the original payload but your adapter does not implement `findBelongsTo`", typeof adapter.findBelongsTo === 'function');

    return _findBelongsTo(adapter, this, owner, link, relationship);
  },

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    The call made to the server, using a Rails backend, will look something like this:

    ```
    Started GET "/api/v1/person?page=1"
    Processing by Api::V1::PersonsController#index as HTML
    Parameters: {"page"=>"1"}
    ```

    If you do something like this:

    ```javascript
    store.query('person', {ids: [1, 2, 3]});
    ```

    The call to the server, using a Rails backend, will look something like this:

    ```
    Started GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
    Processing by Api::V1::PersonsController#index as HTML
    Parameters: {"ids"=>["1", "2", "3"]}
    ```

    This method returns a promise, which is resolved with a `RecordArray`
    once the server returns.

    @method query
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise
  */
  query: function(modelName, query) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);
    var array = this.recordArrayManager
      .createAdapterPopulatedRecordArray(typeClass, query);

    var adapter = this.adapterFor(modelName);

    Ember.assert("You tried to load a query but you have no adapter (for " + typeClass + ")", adapter);
    Ember.assert("You tried to load a query but your adapter does not implement `findQuery`", typeof adapter.findQuery === 'function');

    return promiseArray(_query(adapter, this, typeClass, query, array));
  },

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    This method returns a promise, which is resolved with a `RecordArray`
    once the server returns.

    @method query
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise
    @deprecated Use `store.query instead`
  */
  findQuery: function(modelName, query) {
    Ember.deprecate('store#findQuery is deprecated. You should use store#query instead.');
    return this.query(modelName, query);
  },

  /**
    This method returns an array of all records adapter can find.
    It triggers the adapter's `findAll` method to give it an opportunity to populate
    the array with records of that type.

    @method findAll
    @param {String} modelName
    @return {DS.AdapterPopulatedRecordArray}
  */
  findAll: function(modelName) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);

    return this._fetchAll(typeClass, this.peekAll(modelName));
  },

  /**
    @method _fetchAll
    @private
    @param {DS.Model} typeClass
    @param {DS.RecordArray} array
    @return {Promise} promise
  */
  _fetchAll: function(typeClass, array) {
    var adapter = this.adapterFor(typeClass.modelName);
    var sinceToken = this.typeMapFor(typeClass).metadata.since;

    set(array, 'isUpdating', true);

    Ember.assert("You tried to load all records but you have no adapter (for " + typeClass + ")", adapter);
    Ember.assert("You tried to load all records but your adapter does not implement `findAll`", typeof adapter.findAll === 'function');

    return promiseArray(_findAll(adapter, this, typeClass, sinceToken));
  },

  /**
    @method didUpdateAll
    @param {DS.Model} typeClass
    @private
  */
  didUpdateAll: function(typeClass) {
    var liveRecordArray = this.recordArrayManager.liveRecordArrayFor(typeClass);
    set(liveRecordArray, 'isUpdating', false);
  },

  /**
    This method returns a filtered array that contains all of the
    known records for a given type in the store.

    Note that because it's just a filter, the result will contain any
    locally created records of the type, however, it will not make a
    request to the backend to retrieve additional records. If you
    would like to request all the records from the backend please use
    [store.find](#method_find).

    Also note that multiple calls to `all` for a given type will always
    return the same `RecordArray`.

    Example

    ```javascript
    var localPosts = store.all('post');
    ```

    @method all
    @param {String} modelName
    @return {DS.RecordArray}
  */
  all: function(modelName) {
    Ember.deprecate('Using store.all() has been deprecated. Use store.peekAll() to get all records by a given type without triggering a fetch.');
    return this.peekAll(modelName);
  },

  /**
    This method returns a filtered array that contains all of the
    known records for a given type in the store.

    Note that because it's just a filter, the result will contain any
    locally created records of the type, however, it will not make a
    request to the backend to retrieve additional records. If you
    would like to request all the records from the backend please use
    [store.find](#method_find).

    Also note that multiple calls to `peekAll` for a given type will always
    return the same `RecordArray`.

    Example

    ```javascript
    var localPosts = store.peekAll('post');
    ```

    @method peekAll
    @param {String} modelName
    @return {DS.RecordArray}
  */
  peekAll: function(modelName) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);

    var liveRecordArray = this.recordArrayManager.liveRecordArrayFor(typeClass);
    this.recordArrayManager.populateLiveRecordArray(liveRecordArray, typeClass);

    return liveRecordArray;
  },

  /**
   This method unloads all records in the store.

   Optionally you can pass a type which unload all records for a given type.

   ```javascript
   store.unloadAll();
   store.unloadAll('post');
   ```

   @method unloadAll
   @param {String=} modelName
  */
  unloadAll: function(modelName) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), !modelName || typeof modelName === 'string');
    if (arguments.length === 0) {
      var typeMaps = this.typeMaps;
      var keys = Ember.keys(typeMaps);

      var types = map(keys, byType);

      forEach(types, this.unloadAll, this);
    } else {
      var typeClass = this.modelFor(modelName);
      var typeMap = this.typeMapFor(typeClass);
      var records = typeMap.records.slice();
      var record;

      for (var i = 0; i < records.length; i++) {
        record = records[i];
        record.unloadRecord();
        record.destroy(); // maybe within unloadRecord
      }

      typeMap.metadata = Ember.create(null);
    }

    function byType(entry) {
      return typeMaps[entry]['type'].modelName;
    }
  },

  /**
    Takes a type and filter function, and returns a live RecordArray that
    remains up to date as new records are loaded into the store or created
    locally.

    The filter function takes a materialized record, and returns true
    if the record should be included in the filter and false if it should
    not.

    Example

    ```javascript
    store.filter('post', function(post) {
      return post.get('unread');
    });
    ```

    The filter function is called once on all records for the type when
    it is created, and then once on each newly loaded or created record.

    If any of a record's properties change, or if it changes state, the
    filter function will be invoked again to determine whether it should
    still be in the array.

    Optionally you can pass a query, which is the equivalent of calling
    [find](#method_find) with that same query, to fetch additional records
    from the server. The results returned by the server could then appear
    in the filter if they match the filter function.

    The query itself is not used to filter records, it's only sent to your
    server for you to be able to do server-side filtering. The filter
    function will be applied on the returned results regardless.

    Example

    ```javascript
    store.filter('post', { unread: true }, function(post) {
      return post.get('unread');
    }).then(function(unreadPosts) {
      unreadPosts.get('length'); // 5
      var unreadPost = unreadPosts.objectAt(0);
      unreadPost.set('unread', false);
      unreadPosts.get('length'); // 4
    });
    ```

    @method filter
    @param {String} modelName
    @param {Object} query optional query
    @param {Function} filter
    @return {DS.PromiseArray}
  */
  filter: function(modelName, query, filter) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var promise;
    var length = arguments.length;
    var array;
    var hasQuery = length === 3;

    // allow an optional server query
    if (hasQuery) {
      promise = this.query(modelName, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    modelName = this.modelFor(modelName);

    if (hasQuery) {
      array = this.recordArrayManager.createFilteredRecordArray(modelName, filter, query);
    } else {
      array = this.recordArrayManager.createFilteredRecordArray(modelName, filter);
    }

    promise = promise || Promise.cast(array);

    return promiseArray(promise.then(function() {
      return array;
    }, null, "DS: Store#filter of " + modelName));
  },

  /**
    This method returns if a certain record is already loaded
    in the store. Use this function to know beforehand if a find()
    will result in a request or that it will be a cache hit.

     Example

    ```javascript
    store.recordIsLoaded('post', 1); // false
    store.find('post', 1).then(function() {
      store.recordIsLoaded('post', 1); // true
    });
    ```

    @method recordIsLoaded
    @param {String} modelName
    @param {string} id
    @return {boolean}
  */
  recordIsLoaded: function(modelName, id) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    return this.hasRecordForId(modelName, id);
  },

  /**
    This method returns the metadata for a specific type.

    @method metadataFor
    @param {String} modelName
    @return {object}
  */
  metadataFor: function(modelName) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);
    return this.typeMapFor(typeClass).metadata;
  },

  /**
    This method sets the metadata for a specific type.

    @method setMetadataFor
    @param {String} modelName
    @param {Object} metadata metadata to set
    @return {object}
  */
  setMetadataFor: function(modelName, metadata) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var typeClass = this.modelFor(modelName);
    Ember.merge(this.typeMapFor(typeClass).metadata, metadata);
  },

  // ............
  // . UPDATING .
  // ............

  /**
    If the adapter updates attributes the record will notify
    the store to update its  membership in any filters.
    To avoid thrashing, this method is invoked only once per
    run loop per record.

    @method dataWasUpdated
    @private
    @param {Class} type
    @param {InternalModel} internalModel
  */
  dataWasUpdated: function(type, internalModel) {
    this.recordArrayManager.recordDidChange(internalModel);
  },

  // ..............
  // . PERSISTING .
  // ..............

  /**
    This method is called by `record.save`, and gets passed a
    resolver for the promise that `record.save` returns.

    It schedules saving to happen at the end of the run loop.

    @method scheduleSave
    @private
    @param {InternalModel} internalModel
    @param {Resolver} resolver
    @param {Object} options
  */
  scheduleSave: function(internalModel, resolver, options) {
    var snapshot = internalModel.createSnapshot();
    internalModel.flushChangedAttributes();
    internalModel.adapterWillCommit();
    this._pendingSave.push({
      snapshot: snapshot,
      response: resolver,
      options: options
    });
    once(this, 'flushPendingSave');
  },

  /**
    This method is called at the end of the run loop, and
    flushes any records passed into `scheduleSave`

    @method flushPendingSave
    @private
  */
  flushPendingSave: function() {
    var pending = this._pendingSave.slice();
    this._pendingSave = [];

    forEach(pending, function(pendingItem) {
      var snapshot = pendingItem.snapshot;
      var resolver = pendingItem.resolver;
      var options = pendingItem.options;
      var record = snapshot._internalModel;
      var adapter = this.adapterFor(record.type.modelName);
      var operation;

      if (get(record, 'currentState.stateName') === 'root.deleted.saved') {
        return resolver.resolve();
      } else if (record.isNew()) {
        operation = 'createRecord';
      } else if (record.isDeleted()) {
        operation = 'deleteRecord';
      } else {
        operation = 'updateRecord';
      }

      resolver.resolve(_commit(adapter, this, operation, snapshot, options));
    }, this);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is resolved.

    If the data provides a server-generated ID, it will
    update the record and the store's indexes.

    @method didSaveRecord
    @private
    @param {InternalModel} internalModel the in-flight internal model
    @param {Object} data optional data (see above)
  */
  didSaveRecord: function(internalModel, data) {
    if (data) {
      // normalize relationship IDs into records
      this._backburner.schedule('normalizeRelationships', this, '_setupRelationships', internalModel, internalModel.type, data);
      this.updateId(internalModel, data);
    }

    //We first make sure the primary data has been updated
    //TODO try to move notification to the user to the end of the runloop
    internalModel.adapterDidCommit(data);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected with a `DS.InvalidError`.

    @method recordWasInvalid
    @private
    @param {InternalModel} internalModel
    @param {Object} errors
  */
  recordWasInvalid: function(internalModel, errors) {
    internalModel.adapterDidInvalidate(errors);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected (with anything other than a `DS.InvalidError`).

    @method recordWasError
    @private
    @param {InternalModel} internalModel
  */
  recordWasError: function(internalModel) {
    internalModel.adapterDidError();
  },

  /**
    When an adapter's `createRecord`, `updateRecord` or `deleteRecord`
    resolves with data, this method extracts the ID from the supplied
    data.

    @method updateId
    @private
    @param {InternalModel} internalModel
    @param {Object} data
  */
  updateId: function(internalModel, data) {
    var oldId = internalModel.id;
    var id = coerceId(data.id);

    Ember.assert("An adapter cannot assign a new id to a record that already has an id. " + internalModel + " had id: " + oldId + " and you tried to update it with " + id + ". This likely happened because your server returned data in response to a find or update that had a different id than the one you sent.", oldId === null || id === oldId);

    this.typeMapFor(internalModel.type).idToRecord[id] = internalModel;

    internalModel.setId(id);
  },

  /**
    Returns a map of IDs to client IDs for a given type.

    @method typeMapFor
    @private
    @param {DS.Model} typeClass
    @return {Object} typeMap
  */
  typeMapFor: function(typeClass) {
    var typeMaps = get(this, 'typeMaps');
    var guid = Ember.guidFor(typeClass);
    var typeMap = typeMaps[guid];

    if (typeMap) { return typeMap; }

    typeMap = {
      idToRecord: Ember.create(null),
      records: [],
      metadata: Ember.create(null),
      type: typeClass
    };

    typeMaps[guid] = typeMap;

    return typeMap;
  },

  // ................
  // . LOADING DATA .
  // ................

  /**
    This internal method is used by `push`.

    @method _load
    @private
    @param {(String|DS.Model)} type
    @param {Object} data
  */
  _load: function(type, data) {
    var id = coerceId(data.id);
    var internalModel = this._internalModelForId(type, id);

    internalModel.setupData(data);

    this.recordArrayManager.recordDidChange(internalModel);

    return internalModel;
  },

  /*
    In case someone defined a relationship to a mixin, for example:
    ```
      var Comment = DS.Model.extend({
        owner: belongsTo('commentable'. { polymorphic: true})
      });
      var Commentable = Ember.Mixin.create({
        comments: hasMany('comment')
      });
    ```
    we want to look up a Commentable class which has all the necessary
    relationship metadata. Thus, we look up the mixin and create a mock
    DS.Model, so we can access the relationship CPs of the mixin (`comments`)
    in this case
  */

  _modelForMixin: function(modelName) {
    var normalizedModelName = normalizeModelName(modelName);
    var registry = this.container._registry ? this.container._registry : this.container;
    var mixin = registry.resolve('mixin:' + normalizedModelName);
    if (mixin) {
      //Cache the class as a model
      registry.register('model:' + normalizedModelName, DS.Model.extend(mixin));
    }
    var factory = this.modelFactoryFor(normalizedModelName);
    if (factory) {
      factory.__isMixin = true;
      factory.__mixin = mixin;
    }

    return factory;
  },

  /**
    Returns a model class for a particular key. Used by
    methods that take a type key (like `find`, `createRecord`,
    etc.)

    @method modelFor
    @param {String} modelName
    @return {DS.Model}
  */
  modelFor: function(modelName) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');

    var factory = this.modelFactoryFor(modelName);
    if (!factory) {
      //Support looking up mixins as base types for polymorphic relationships
      factory = this._modelForMixin(modelName);
    }
    if (!factory) {
      throw new Ember.Error("No model was found for '" + modelName + "'");
    }
    factory.modelName = factory.modelName || normalizeModelName(modelName);

    // deprecate typeKey
    if (!('typeKey' in factory)) {
      Ember.defineProperty(factory, 'typeKey', {
        enumerable: true,
        configurable: false,
        get: function() {
          Ember.deprecate('Usage of `typeKey` has been deprecated and will be removed in Ember Data 1.0. It has been replaced by `modelName` on the model class.');
          var typeKey = this.modelName;
          if (typeKey) {
            typeKey =  Ember.String.camelize(this.modelName);
          }
          return typeKey;
        },
        set: function() {
          Ember.assert('Setting typeKey is not supported. In addition, typeKey has also been deprecated in favor of modelName. Setting modelName is also not supported.');
        }
      });
    }

    return factory;
  },

  modelFactoryFor: function(modelName) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var normalizedKey = normalizeModelName(modelName);
    return this.container.lookupFactory('model:' + normalizedKey);
  },

  /**
    Push some data for a given type into the store.

    This method expects normalized data:

    * The ID is a key named `id` (an ID is mandatory)
    * The names of attributes are the ones you used in
      your model's `DS.attr`s.
    * Your relationships must be:
      * represented as IDs or Arrays of IDs
      * represented as model instances
      * represented as URLs, under the `links` key

    For this model:

    ```app/models/person.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr(),

      children: DS.hasMany('person')
    });
    ```

    To represent the children as IDs:

    ```js
    {
      id: 1,
      firstName: "Tom",
      lastName: "Dale",
      children: [1, 2, 3]
    }
    ```

    To represent the children relationship as a URL:

    ```js
    {
      id: 1,
      firstName: "Tom",
      lastName: "Dale",
      links: {
        children: "/people/1/children"
      }
    }
    ```

    If you're streaming data or implementing an adapter, make sure
    that you have converted the incoming data into this form. The
    store's [normalize](#method_normalize) method is a convenience
    helper for converting a json payload into the form Ember Data
    expects.

    ```js
    store.push('person', store.normalize('person', data));
    ```

    This method can be used both to push in brand new
    records, as well as to update existing records.

    @method push
    @param {String} modelName
    @param {Object} data
    @return {DS.Model|Array} the record(s) that was created or
      updated.
  */
  push: function(modelName, data) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string' || typeof data === 'undefined');
    var internalModel = this._pushInternalModel(modelName, data);
    if (Ember.isArray(internalModel)) {
      return map(internalModel, (item) => {
        return item.getRecord();
      });
    }
    return internalModel.getRecord();
  },

  _pushInternalModel: function(modelName, data) {
    if (Ember.typeOf(modelName) === 'object' && Ember.typeOf(data) === 'undefined') {
      //TODO Remove once the transition is complete
      var result = pushPayload(this, modelName);
      if (Ember.isArray(result)) {
        return map(result, (item) => {
          return item._internalModel;
        });
      }
      return result._internalModel;
    }
    Ember.assert("Expected an object as `data` in a call to `push` for " + modelName + " , but was " + Ember.typeOf(data), Ember.typeOf(data) === 'object');
    Ember.assert("You must include an `id` for " + modelName + " in an object passed to `push`", data.id != null && data.id !== '');

    var type = this.modelFor(modelName);
    var filter = Ember.EnumerableUtils.filter;

    // If Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS is set to true and the payload
    // contains unknown keys, log a warning.
    if (Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS) {
      Ember.warn("The payload for '" + type.modelName + "' contains these unknown keys: " +
        Ember.inspect(filter(Ember.keys(data), function(key) {
          return !(key === 'id' || key === 'links' || get(type, 'fields').has(key) || key.match(/Type$/));
        })) + ". Make sure they've been defined in your model.",
        filter(Ember.keys(data), function(key) {
          return !(key === 'id' || key === 'links' || get(type, 'fields').has(key) || key.match(/Type$/));
        }).length === 0
      );
    }

    // Actually load the record into the store.
    var internalModel = this._load(modelName, data);

    var store = this;

    this._backburner.join(function() {
      store._backburner.schedule('normalizeRelationships', store, '_setupRelationships', internalModel, type, data);
    });

    return internalModel;
  },

  _setupRelationships: function(record, type, data) {
    // If the payload contains relationships that are specified as
    // IDs, normalizeRelationships will convert them into DS.Model instances
    // (possibly unloaded) before we push the payload into the
    // store.

    data = normalizeRelationships(this, type, data);


    // Now that the pushed record as well as any related records
    // are in the store, create the data structures used to track
    // relationships.
    setupRelationships(this, record, data);
  },

  /**
    Push some raw data into the store.

    This method can be used both to push in brand new
    records, as well as to update existing records. You
    can push in more than one type of object at once.
    All objects should be in the format expected by the
    serializer.

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.ActiveModelSerializer;
    ```

    ```js
    var pushData = {
      posts: [
        { id: 1, post_title: "Great post", comment_ids: [2] }
      ],
      comments: [
        { id: 2, comment_body: "Insightful comment" }
      ]
    }

    store.pushPayload(pushData);
    ```

    By default, the data will be deserialized using a default
    serializer (the application serializer if it exists).

    Alternatively, `pushPayload` will accept a model type which
    will determine which serializer will process the payload.
    However, the serializer itself (processing this data via
    `normalizePayload`) will not know which model it is
    deserializing.

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.ActiveModelSerializer;
    ```

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer;
    ```

    ```js
    store.pushPayload('comment', pushData); // Will use the application serializer
    store.pushPayload('post', pushData); // Will use the post serializer
    ```

    @method pushPayload
    @param {String} modelName Optionally, a model type used to determine which serializer will be used
    @param {Object} inputPayload
  */
  pushPayload: function (modelName, inputPayload) {
    var serializer;
    var payload;
    if (!inputPayload) {
      payload = modelName;
      serializer = defaultSerializer(this.container);
      Ember.assert("You cannot use `store#pushPayload` without a modelName unless your default serializer defines `pushPayload`", typeof serializer.pushPayload === 'function');
    } else {
      payload = inputPayload;
      Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
      serializer = this.serializerFor(modelName);
    }
    var store = this;
    this._adapterRun(function() {
      serializer.pushPayload(store, payload);
    });
  },

  /**
    `normalize` converts a json payload into the normalized form that
    [push](#method_push) expects.

    Example

    ```js
    socket.on('message', function(message) {
      var modelName = message.model;
      var data = message.data;
      store.push(modelName, store.normalize(modelName, data));
    });
    ```

    @method normalize
    @param {String} modelName The name of the model type for this payload
    @param {Object} payload
    @return {Object} The normalized payload
  */
  normalize: function (modelName, payload) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var serializer = this.serializerFor(modelName);
    var model = this.modelFor(modelName);
    return serializer.normalize(model, payload);
  },

  /**
    @method update
    @param {String} modelName
    @param {Object} data
    @return {DS.Model} the record that was updated.
    @deprecated Use [push](#method_push) instead
  */
  update: function(modelName, data) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    Ember.deprecate('Using store.update() has been deprecated since store.push() now handles partial updates. You should use store.push() instead.');
    return this.push(modelName, data);
  },

  /**
    If you have an Array of normalized data to push,
    you can call `pushMany` with the Array, and it will
    call `push` repeatedly for you.

    @method pushMany
    @param {String} modelName
    @param {Array} datas
    @return {Array}
  */
  pushMany: function(modelName, datas) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var length = datas.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++) {
      result[i] = this.push(modelName, datas[i]);
    }

    return result;
  },

  /**
    @method metaForType
    @param {String} modelName
    @param {Object} metadata
    @deprecated Use [setMetadataFor](#method_setMetadataFor) instead
  */
  metaForType: function(modelName, metadata) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    Ember.deprecate('Using store.metaForType() has been deprecated. Use store.setMetadataFor() to set metadata for a specific type.');
    this.setMetadataFor(modelName, metadata);
  },

  /**
    Build a brand new record for a given type, ID, and
    initial data.

    @method buildRecord
    @private
    @param {DS.Model} type
    @param {String} id
    @param {Object} data
    @return {InternalModel} internal model
  */
  buildInternalModel: function(type, id, data) {
    var typeMap = this.typeMapFor(type);
    var idToRecord = typeMap.idToRecord;

    Ember.assert('The id ' + id + ' has already been used with another record of type ' + type.toString() + '.', !id || !idToRecord[id]);
    Ember.assert("`" + Ember.inspect(type)+ "` does not appear to be an ember-data model", (typeof type._create === 'function') );

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    var internalModel = new InternalModel(type, id, this, this.container, data);

    // if we're creating an item, this process will be done
    // later, once the object has been persisted.
    if (id) {
      idToRecord[id] = internalModel;
    }

    typeMap.records.push(internalModel);

    return internalModel;
  },

  //Called by the state machine to notify the store that the record is ready to be interacted with
  recordWasLoaded: function(record) {
    this.recordArrayManager.recordWasLoaded(record);
  },

  // ...............
  // . DESTRUCTION .
  // ...............

  /**
    @method dematerializeRecord
    @private
    @param {DS.Model} record
    @deprecated Use [unloadRecord](#method_unloadRecord) instead
  */
  dematerializeRecord: function(record) {
    Ember.deprecate('Using store.dematerializeRecord() has been deprecated since it was intended for private use only. You should use store.unloadRecord() instead.');
    this._dematerializeRecord(record);
  },

  /**
    When a record is destroyed, this un-indexes it and
    removes it from any record arrays so it can be GCed.

    @method _dematerializeRecord
    @private
    @param {InternalModel} internalModel
  */
  _dematerializeRecord: function(internalModel) {
    var type = internalModel.type;
    var typeMap = this.typeMapFor(type);
    var id = internalModel.id;

    internalModel.updateRecordArrays();

    if (id) {
      delete typeMap.idToRecord[id];
    }

    var loc = indexOf(typeMap.records, internalModel);
    typeMap.records.splice(loc, 1);
  },

  // ......................
  // . PER-TYPE ADAPTERS
  // ......................

  /**
    Returns an instance of the adapter for a given type. For
    example, `adapterFor('person')` will return an instance of
    `App.PersonAdapter`.

    If no `App.PersonAdapter` is found, this method will look
    for an `App.ApplicationAdapter` (the default adapter for
    your entire application).

    If no `App.ApplicationAdapter` is found, it will return
    the value of the `defaultAdapter`.

    @method adapterFor
    @private
    @param {String} modelName
    @return DS.Adapter
  */
  adapterFor: function(modelOrClass) {
    var modelName;

    Ember.deprecate('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelOrClass === 'string');

    if (typeof modelOrClass !== 'string') {
      modelName = modelOrClass.modelName;
    } else {
      modelName = modelOrClass;
    }

    return this.lookupAdapter(modelName);
  },

  _adapterRun: function (fn) {
    return this._backburner.run(fn);
  },

  // ..............................
  // . RECORD CHANGE NOTIFICATION .
  // ..............................

  /**
    Returns an instance of the serializer for a given type. For
    example, `serializerFor('person')` will return an instance of
    `App.PersonSerializer`.

    If no `App.PersonSerializer` is found, this method will look
    for an `App.ApplicationSerializer` (the default serializer for
    your entire application).

    if no `App.ApplicationSerializer` is found, it will attempt
    to get the `defaultSerializer` from the `PersonAdapter`
    (`adapterFor('person')`).

    If a serializer cannot be found on the adapter, it will fall back
    to an instance of `DS.JSONSerializer`.

    @method serializerFor
    @private
    @param {String} modelName the record to serialize
    @return {DS.Serializer}
  */
  serializerFor: function(modelOrClass) {
    var modelName;

    Ember.deprecate('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelOrClass), typeof modelOrClass === 'string');
    if (typeof modelOrClass !== 'string') {
      modelName = modelOrClass.modelName;
    } else {
      modelName = modelOrClass;
    }

    var fallbacks = [
      'application',
      this.adapterFor(modelName).get('defaultSerializer'),
      '-default'
    ];

    var serializer = this.lookupSerializer(modelName, fallbacks);
    return serializer;
  },

  /**
    Retrieve a particular instance from the
    container cache. If not found, creates it and
    placing it in the cache.

    Enabled a store to manage local instances of
    adapters and serializers.

    @method retrieveManagedInstance
    @private
    @param {String} modelName the object modelName
    @param {String} name the object name
    @param {Array} fallbacks the fallback objects to lookup if the lookup for modelName or 'application' fails
    @return {Ember.Object}
  */
  retrieveManagedInstance: function(type, modelName, fallbacks) {
    var normalizedModelName = normalizeModelName(modelName);

    var instance = this._instanceCache.get(type, normalizedModelName, fallbacks);
    set(instance, 'store', this);
    return instance;
  },

  lookupAdapter: function(name) {
    return this.retrieveManagedInstance('adapter', name, this.get('_adapterFallbacks'));
  },

  _adapterFallbacks: Ember.computed('adapter', function() {
    var adapter = this.get('adapter');
    return ['application', adapter, '-rest'];
  }),

  lookupSerializer: function(name, fallbacks) {
    return this.retrieveManagedInstance('serializer', name, fallbacks);
  },

  willDestroy: function() {
    this.recordArrayManager.destroy();

    this.unloadAll();

    for (var cacheKey in this._containerCache) {
      this._containerCache[cacheKey].destroy();
      delete this._containerCache[cacheKey];
    }

    delete this._containerCache;
  }

});


function normalizeRelationships(store, type, data, record) {
  type.eachRelationship(function(key, relationship) {
    var kind = relationship.kind;
    var value = data[key];
    if (kind === 'belongsTo') {
      deserializeRecordId(store, data, key, relationship, value);
    } else if (kind === 'hasMany') {
      deserializeRecordIds(store, data, key, relationship, value);
    }
  });

  return data;
}

function deserializeRecordId(store, data, key, relationship, id) {
  if (isNone(id)) {
    return;
  }

  //If record objects were given to push directly, uncommon, not sure whether we should actually support
  if (id instanceof Model) {
    data[key] = id._internalModel;
    return;
  }

  Ember.assert("A " + relationship.parentType + " record was pushed into the store with the value of " + key + " being " + Ember.inspect(id) + ", but " + key + " is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.", !Ember.isArray(id));

  var type;

  if (typeof id === 'number' || typeof id === 'string') {
    type = typeFor(relationship, key, data);
    data[key] = store._internalModelForId(type, id);
  } else if (typeof id === 'object') {
    // hasMany polymorphic
    Ember.assert('Ember Data expected a number or string to represent the record(s) in the `' + relationship.key + '` relationship instead it found an object. If this is a polymorphic relationship please specify a `type` key. If this is an embedded relationship please include the `DS.EmbeddedRecordsMixin` and specify the `' + relationship.key +'` property in your serializer\'s attrs object.', id.type);
    data[key] = store._internalModelForId(id.type, id.id);
  }
}

function typeFor(relationship, key, data) {
  if (relationship.options.polymorphic) {
    return data[key + "Type"];
  } else {
    return relationship.type;
  }
}

function deserializeRecordIds(store, data, key, relationship, ids) {
  if (isNone(ids)) {
    return;
  }

  Ember.assert("A " + relationship.parentType + " record was pushed into the store with the value of " + key + " being '" + Ember.inspect(ids) + "', but " + key + " is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.", Ember.isArray(ids));
  for (var i=0, l=ids.length; i<l; i++) {
    deserializeRecordId(store, ids, i, relationship, ids[i]);
  }
}

// Delegation to the adapter and promise management



function defaultSerializer(container) {
  return container.lookup('serializer:application') ||
         container.lookup('serializer:-default');
}

function _commit(adapter, store, operation, snapshot, options) {
  var record = snapshot._internalModel;
  var modelName = snapshot.modelName;
  var type = store.modelFor(modelName);
  var promise = adapter[operation](store, type, snapshot, options); // TODO check this out
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Extract and notify about " + operation + " completion of " + record;

  Ember.assert("Your adapter's '" + operation + "' method must return a value, but it returned `undefined", promise !==undefined);

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    store._adapterRun(function() {
      var payload, data;
      if (adapterPayload) {
        payload = normalizeResponseHelper(serializer, store, type, adapterPayload, snapshot.id, operation);
        data = convertResourceObject(payload.data);
      }
      store.didSaveRecord(record, data);
    });

    return record;
  }, function(reason) {
    if (reason instanceof InvalidError) {
      var errors = serializer.extractErrors(store, type, reason.errors, snapshot.id);
      store.recordWasInvalid(record, errors);
      reason = new InvalidError(errors);
    } else {
      store.recordWasError(record, reason);
    }

    throw reason;
  }, label);
}

function setupRelationships(store, record, data) {
  var typeClass = record.type;

  typeClass.eachRelationship(function(key, descriptor) {
    var kind = descriptor.kind;
    var value = data[key];
    var relationship;

    if (data.links && data.links[key]) {
      relationship = record._relationships.get(key);
      relationship.updateLink(data.links[key]);
    }

    if (data.meta && data.meta.hasOwnProperty(key)) {
      relationship = record._relationships.get(key);
      relationship.updateMeta(data.meta[key]);
    }

    if (value !== undefined) {
      if (kind === 'belongsTo') {
        relationship = record._relationships.get(key);
        relationship.setCanonicalRecord(value);
      } else if (kind === 'hasMany') {
        relationship = record._relationships.get(key);
        relationship.updateRecordsFromAdapter(value);
      }
    }
  });
}

function deprecatePreload(preloadOrOptions, type, methodName) {
  if (preloadOrOptions) {
    var modelProperties = [];
    var fields = Ember.get(type, 'fields');
    fields.forEach(function(fieldType, key) {
      modelProperties.push(key);
    });
    var preloadDetected = modelProperties.reduce(function(memo, key) {
      return typeof preloadOrOptions[key] !== 'undefined' || memo;
    }, false);
    if (preloadDetected) {
      Ember.deprecate(`Passing a preload argument to \`store.${methodName}\` is deprecated. Please move it to the preload key on the ${methodName} \`options\` argument.`);
      var preload = preloadOrOptions;
      return {
        preload: preload
      };
    }
  }
  return preloadOrOptions;
}

export { Store };
export default Store;
