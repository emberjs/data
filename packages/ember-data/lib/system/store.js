/*globals Ember*/
/*jshint eqnull:true*/

/**
  @module ember-data
*/

import {
  InvalidError,
  Adapter
} from "ember-data/system/adapter";
import { singularize } from "ember-inflector/system/string";
import {
  Map
} from "ember-data/system/map";

import {
  promiseArray,
  promiseObject
} from "ember-data/system/promise_proxies";


var get = Ember.get;
var set = Ember.set;
var once = Ember.run.once;
var isNone = Ember.isNone;
var forEach = Ember.EnumerableUtils.forEach;
var indexOf = Ember.EnumerableUtils.indexOf;
var map = Ember.EnumerableUtils.map;
var Promise = Ember.RSVP.Promise;
var copy = Ember.copy;
var Store, RecordArrayManager, Model;

var camelize = Ember.String.camelize;

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
//   * +reference+ means a record reference object, which holds metadata about a
//     record, even if it has not yet been fully materialized.
//   * +type+ means a subclass of DS.Model.

// Used by the store to normalize IDs entering the store.  Despite the fact
// that developers may provide IDs as numbers (e.g., `store.find(Person, 1)`),
// it is important that internally we use strings, since IDs may be serialized
// and lose type information.  For example, Ember's router may put a record's
// ID into the URL, and if we later try to deserialize that URL and find the
// corresponding record, we will not know if it is a string or a number.
function coerceId(id) {
  return id == null ? null : id+'';
}

/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of `DS.Model` that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Define your application's store like this:

  ```javascript
  MyApp.Store = DS.Store.extend();
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

  ```javascript
  MyApp.ApplicationAdapter = MyApp.CustomAdapter
  ```

  You can learn more about writing a custom adapter by reading the `DS.Adapter`
  documentation.

  ### Store createRecord() vs. push() vs. pushPayload() vs. update()

  The store provides multiple ways to create new record objects. They have
  some subtle differences in their use which are detailed below:

  [createRecord](#method_createRecord) is used for creating new
  records on the client side. This will return a new record in the
  `created.uncommitted` state. In order to persist this record to the
  backend you will need to call `record.save()`.

  [push](#method_push) is used to notify Ember Data's store of new or
  updated records that exist in the backend. This will return a record
  in the `loaded.saved` state. The primary use-case for `store#push` is
  to notify Ember Data about record updates that happen
  outside of the normal adapter methods (for example
  [SSE](http://dev.w3.org/html5/eventsource/) or [Web
  Sockets](http://www.w3.org/TR/2009/WD-websockets-20091222/)).

  [pushPayload](#method_pushPayload) is a convenience wrapper for
  `store#push` that will deserialize payloads if the
  Serializer implements a `pushPayload` method.

  [update](#method_update) works like `push`, except it can handle
  partial attributes without overwriting the existing record
  properties.

  Note: When creating a new record using any of the above methods
  Ember Data will update `DS.RecordArray`s such as those returned by
  `store#all()`, `store#findAll()` or `store#filter()`. This means any
  data bindings or computed properties that depend on the RecordArray
  will automatically be synced to include the new or updated record
  values.

  @class Store
  @namespace DS
  @extends Ember.Object
*/
Store = Ember.Object.extend({

  /**
    @method init
    @private
  */
  init: function() {
    // internal bookkeeping; not observable
    if (!RecordArrayManager) { RecordArrayManager = requireModule("ember-data/system/record_array_manager")["default"]; }
    this.typeMaps = {};
    this.recordArrayManager = RecordArrayManager.create({
      store: this
    });
    this._pendingSave = [];
    //Used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = Map.create();
  },

  /**
    The adapter to use to communicate to a backend server or other persistence layer.

    This can be specified as an instance, class, or string.

    If you want to specify `App.CustomAdapter` as a string, do:

    ```js
    adapter: 'custom'
    ```

    @property adapter
    @default DS.RESTAdapter
    @type {DS.Adapter|String}
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
    return this.serializerFor(record.constructor.typeKey).serialize(record, options);
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

    Ember.assert('You tried to set `adapter` property to an instance of `DS.Adapter`, where it should be a name or a factory', !(adapter instanceof Adapter));

    if (typeof adapter === 'string') {
      adapter = this.container.lookup('adapter:' + adapter) || this.container.lookup('adapter:application') || this.container.lookup('adapter:-rest');
    }

    if (DS.Adapter.detect(adapter)) {
      adapter = adapter.create({
        container: this.container
      });
    }

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
    @param {String} type
    @param {Object} properties a hash of properties to set on the
      newly created record.
    @return {DS.Model} record
  */
  createRecord: function(typeName, inputProperties) {
    var type = this.modelFor(typeName);
    var properties = copy(inputProperties) || {};

    // If the passed properties do not include a primary key,
    // give the adapter an opportunity to generate one. Typically,
    // client-side ID generators will use something like uuid.js
    // to avoid conflicts.

    if (isNone(properties.id)) {
      properties.id = this._generateId(type);
    }

    // Coerce ID to a string
    properties.id = coerceId(properties.id);

    var record = this.buildRecord(type, properties.id);

    // Move the record out of its initial `empty` state into
    // the `loaded` state.
    record.loadedData();

    // Set the properties specified on the record.
    record.setProperties(properties);

    return record;
  },

  /**
    If possible, this method asks the adapter to generate an ID for
    a newly created record.

    @method _generateId
    @private
    @param {String} type
    @return {String} if the adapter can generate one, an ID
  */
  _generateId: function(type) {
    var adapter = this.adapterFor(type);

    if (adapter && adapter.generateIdForRecord) {
      return adapter.generateIdForRecord(this);
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
    store.find('comment', 2, {post: 1});
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

    To find all records for a type, call `find` with no additional parameters:

    ```javascript
    store.find('person');
    ```

    This will ask the adapter's `findAll` method to find the records for the
    given type, and return a promise that will be resolved once the server
    returns the values.

    ---

    To find a record by a query, call `find` with a hash as the second
    parameter:

    ```javascript
    store.find('person', { page: 1 });
    ```

    This will ask the adapter's `findQuery` method to find the records for
    the query, and return a promise that will be resolved once the server
    responds.

    @method find
    @param {String or subclass of DS.Model} type
    @param {Object|String|Integer|null} id
    @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
    @return {Promise} promise
  */
  find: function(type, id, preload) {
    Ember.assert("You need to pass a type to the store's find method", arguments.length >= 1);
    Ember.assert("You may not pass `" + id + "` as id to the store's find method", arguments.length === 1 || !Ember.isNone(id));

    if (arguments.length === 1) {
      return this.findAll(type);
    }

    // We are passed a query instead of an id.
    if (Ember.typeOf(id) === 'object') {
      return this.findQuery(type, id);
    }

    return this.findById(type, coerceId(id), preload);
  },

  /**
    This method returns a fresh record for a given type and id combination.

    If a record is available for the given type/id combination, then it will fetch this record from the store then reload it. If there's no record corresponding in the store it will simply call store.find.

    @method fetch
    @param {String or subclass of DS.Model} type
    @param {Object|String|Integer|null} id
    @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
    @return {Promise} promise
  */
  fetch: function(type, id, preload) {
    if (this.hasRecordForId(type, id)) {
      return this.getById(type, id).reload();
    } else {
      return this.find(type, id, preload);
    }
  },

  /**
    This method returns a record for a given type and id combination.

    @method findById
    @private
    @param {String or subclass of DS.Model} type
    @param {String|Integer} id
    @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
    @return {Promise} promise
  */
  findById: function(typeName, id, preload) {

    var type = this.modelFor(typeName);
    var record = this.recordForId(type, id);

    return this._findByRecord(record, preload);
  },

  _findByRecord: function(record, preload) {
    var fetchedRecord;

    if (preload) {
      record._preloadData(preload);
    }

    if (get(record, 'isEmpty')) {
      fetchedRecord = this.scheduleFetch(record);
      //TODO double check about reloading
    } else if (get(record, 'isLoading')){
      fetchedRecord = record._loadingPromise;
    }

    return promiseObject(fetchedRecord || record, "DS: Store#findByRecord " + record.typeKey + " with id: " + get(record, 'id'));
  },

  /**
    This method makes a series of requests to the adapter's `find` method
    and returns a promise that resolves once they are all loaded.

    @private
    @method findByIds
    @param {String} type
    @param {Array} ids
    @return {Promise} promise
  */
  findByIds: function(type, ids) {
    var store = this;

    return promiseArray(Ember.RSVP.all(map(ids, function(id) {
      return store.findById(type, id);
    })).then(Ember.A, null, "DS: Store#findByIds of " + type + " complete"));
  },

  /**
    This method is called by `findById` if it discovers that a particular
    type/id pair hasn't been loaded yet to kick off a request to the
    adapter.

    @method fetchRecord
    @private
    @param {DS.Model} record
    @return {Promise} promise
  */
  fetchRecord: function(record) {
    var type = record.constructor;
    var id = get(record, 'id');
    var adapter = this.adapterFor(type);

    Ember.assert("You tried to find a record but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to find a record but your adapter (for " + type + ") does not implement 'find'", typeof adapter.find === 'function');

    var promise = _find(adapter, this, type, id, record);
    return promise;
  },

  scheduleFetchMany: function(records) {
    return Promise.all(map(records, this.scheduleFetch, this));
  },

  scheduleFetch: function(record) {
    var type = record.constructor;
    if (isNone(record)) { return null; }
    if (record._loadingPromise) { return record._loadingPromise; }

    var resolver = Ember.RSVP.defer('Fetching ' + type + 'with id: ' + record.get('id'));
    var recordResolverPair = {
      record: record,
      resolver: resolver
    };
    var promise = resolver.promise;

    record.loadingData(promise);

    if (!this._pendingFetch.get(type)){
      this._pendingFetch.set(type, [recordResolverPair]);
    } else {
      this._pendingFetch.get(type).push(recordResolverPair);
    }
    Ember.run.scheduleOnce('afterRender', this, this.flushAllPendingFetches);

    return promise;
  },

  flushAllPendingFetches: function(){
    if (this.isDestroyed || this.isDestroying) {
      return;
    }

    this._pendingFetch.forEach(this._flushPendingFetchForType, this);
    this._pendingFetch = Map.create();
  },

  _flushPendingFetchForType: function (recordResolverPairs, type) {
    var store = this;
    var adapter = store.adapterFor(type);
    var shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    var records = Ember.A(recordResolverPairs).mapBy('record');

    function _fetchRecord(recordResolverPair) {
      recordResolverPair.resolver.resolve(store.fetchRecord(recordResolverPair.record));
    }

    function resolveFoundRecords(records) {
      forEach(records, function(record){
        var pair = Ember.A(recordResolverPairs).findBy('record', record);
        if (pair){
          var resolver = pair.resolver;
          resolver.resolve(record);
        }
      });
    }

    function makeMissingRecordsRejector(requestedRecords) {
      return function rejectMissingRecords(resolvedRecords) {
        var missingRecords = requestedRecords.without(resolvedRecords);
        rejectRecords(missingRecords);
      };
    }

    function makeRecordsRejector(records) {
      return function (error) {
        rejectRecords(records, error);
      };
    }

    function rejectRecords(records, error) {
      forEach(records, function(record){
        var pair = Ember.A(recordResolverPairs).findBy('record', record);
        if (pair){
          var resolver = pair.resolver;
          resolver.reject(error);
        }
      });
    }

    if (recordResolverPairs.length === 1) {
      _fetchRecord(recordResolverPairs[0]);
    } else if (shouldCoalesce) {
      var groups = adapter.groupRecordsForFindMany(this, records);
      forEach(groups, function (groupOfRecords) {
        var requestedRecords = Ember.A(groupOfRecords);
        var ids = requestedRecords.mapBy('id');
        if (ids.length > 1) {
          _findMany(adapter, store, type, ids, requestedRecords).
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
    @param {String or subclass of DS.Model} type
    @param {String|Integer} id
    @return {DS.Model|null} record
  */
  getById: function(type, id) {
    if (this.hasRecordForId(type, id)) {
      return this.recordForId(type, id);
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
    @param {DS.Model} record
    @return {Promise} promise
  */
  reloadRecord: function(record) {
    var type = record.constructor;
    var adapter = this.adapterFor(type);
    var id = get(record, 'id');

    Ember.assert("You cannot reload a record without an ID", id);
    Ember.assert("You tried to reload a record but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to reload a record but your adapter does not implement `find`", typeof adapter.find === 'function');

    return this.scheduleFetch(record);
  },

  /**
    Returns true if a record for a given type and ID is already loaded.

    @method hasRecordForId
    @param {String or subclass of DS.Model} type
    @param {String|Integer} id
    @return {Boolean}
  */
  hasRecordForId: function(typeName, inputId) {
    var type = this.modelFor(typeName);
    var id = coerceId(inputId);
    return !!this.typeMapFor(type).idToRecord[id];
  },

  /**
    Returns id record for a given type and ID. If one isn't already loaded,
    it builds a new record and leaves it in the `empty` state.

    @method recordForId
    @private
    @param {String or subclass of DS.Model} type
    @param {String|Integer} id
    @return {DS.Model} record
  */
  recordForId: function(typeName, inputId) {
    var type = this.modelFor(typeName);
    var id = coerceId(inputId);
    var idToRecord = this.typeMapFor(type).idToRecord;
    var record = idToRecord[id];

    if (!record || !idToRecord[id]) {
      record = this.buildRecord(type, id);
    }

    return record;
  },

  /**
    @method findMany
    @private
    @param {DS.Model} owner
    @param {Array} records
    @param {String or subclass of DS.Model} type
    @param {Resolver} resolver
    @return {DS.ManyArray} records
  */
  findMany: function(records) {
    var store = this;
    return Promise.all(map(records, function(record) {
      return store._findByRecord(record);
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
    @param {String or subclass of DS.Model} type
    @return {Promise} promise
  */
  findHasMany: function(owner, link, type) {
    var adapter = this.adapterFor(owner.constructor);

    Ember.assert("You tried to load a hasMany relationship but you have no adapter (for " + owner.constructor + ")", adapter);
    Ember.assert("You tried to load a hasMany relationship from a specified `link` in the original payload but your adapter does not implement `findHasMany`", typeof adapter.findHasMany === 'function');

    return _findHasMany(adapter, this, owner, link, type);
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
    var adapter = this.adapterFor(owner.constructor);

    Ember.assert("You tried to load a belongsTo relationship but you have no adapter (for " + owner.constructor + ")", adapter);
    Ember.assert("You tried to load a belongsTo relationship from a specified `link` in the original payload but your adapter does not implement `findBelongsTo`", typeof adapter.findBelongsTo === 'function');

    return _findBelongsTo(adapter, this, owner, link, relationship);
  },

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    This method returns a promise, which is resolved with a `RecordArray`
    once the server returns.

    @method findQuery
    @private
    @param {String or subclass of DS.Model} type
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise
  */
  findQuery: function(typeName, query) {
    var type = this.modelFor(typeName);
    var array = this.recordArrayManager
      .createAdapterPopulatedRecordArray(type, query);

    var adapter = this.adapterFor(type);

    Ember.assert("You tried to load a query but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to load a query but your adapter does not implement `findQuery`", typeof adapter.findQuery === 'function');

    return promiseArray(_findQuery(adapter, this, type, query, array));
  },

  /**
    This method returns an array of all records adapter can find.
    It triggers the adapter's `findAll` method to give it an opportunity to populate
    the array with records of that type.

    @method findAll
    @private
    @param {String or subclass of DS.Model} type
    @return {DS.AdapterPopulatedRecordArray}
  */
  findAll: function(typeName) {
    var type = this.modelFor(typeName);

    return this.fetchAll(type, this.all(type));
  },

  /**
    @method fetchAll
    @private
    @param {DS.Model} type
    @param {DS.RecordArray} array
    @return {Promise} promise
  */
  fetchAll: function(type, array) {
    var adapter = this.adapterFor(type);
    var sinceToken = this.typeMapFor(type).metadata.since;

    set(array, 'isUpdating', true);

    Ember.assert("You tried to load all records but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to load all records but your adapter does not implement `findAll`", typeof adapter.findAll === 'function');

    return promiseArray(_findAll(adapter, this, type, sinceToken));
  },

  /**
    @method didUpdateAll
    @param {DS.Model} type
  */
  didUpdateAll: function(type) {
    var findAllCache = this.typeMapFor(type).findAllCache;
    set(findAllCache, 'isUpdating', false);
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
    @param {String or subclass of DS.Model} type
    @return {DS.RecordArray}
  */
  all: function(typeName) {
    var type = this.modelFor(typeName);
    var typeMap = this.typeMapFor(type);
    var findAllCache = typeMap.findAllCache;

    if (findAllCache) { return findAllCache; }

    var array = this.recordArrayManager.createRecordArray(type);

    typeMap.findAllCache = array;
    return array;
  },


  /**
    This method unloads all of the known records for a given type.

    ```javascript
    store.unloadAll('post');
    ```

    @method unloadAll
    @param {String or subclass of DS.Model} type
  */
  unloadAll: function(type) {
    var modelType = this.modelFor(type);
    var typeMap = this.typeMapFor(modelType);
    var records = typeMap.records.slice();
    var record;

    for (var i = 0; i < records.length; i++) {
      record = records[i];
      record.unloadRecord();
      record.destroy(); // maybe within unloadRecord
    }

    typeMap.findAllCache = null;
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
    @param {String or subclass of DS.Model} type
    @param {Object} query optional query
    @param {Function} filter
    @return {DS.PromiseArray}
  */
  filter: function(type, query, filter) {
    var promise;
    var length = arguments.length;
    var array;
    var hasQuery = length === 3;

    // allow an optional server query
    if (hasQuery) {
      promise = this.findQuery(type, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    type = this.modelFor(type);

    if (hasQuery) {
      array = this.recordArrayManager.createFilteredRecordArray(type, filter, query);
    } else {
      array = this.recordArrayManager.createFilteredRecordArray(type, filter);
    }

    promise = promise || Promise.cast(array);


    return promiseArray(promise.then(function() {
      return array;
    }, null, "DS: Store#filter of " + type));
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
    @param {String or subclass of DS.Model} type
    @param {string} id
    @return {boolean}
  */
  recordIsLoaded: function(type, id) {
    if (!this.hasRecordForId(type, id)) { return false; }
    return !get(this.recordForId(type, id), 'isEmpty');
  },

  /**
    This method returns the metadata for a specific type.

    @method metadataFor
    @param {String or subclass of DS.Model} type
    @return {object}
  */
  metadataFor: function(type) {
    type = this.modelFor(type);
    return this.typeMapFor(type).metadata;
  },

  // ............
  // . UPDATING .
  // ............

  /**
    If the adapter updates attributes or acknowledges creation
    or deletion, the record will notify the store to update its
    membership in any filters.
    To avoid thrashing, this method is invoked only once per

    run loop per record.

    @method dataWasUpdated
    @private
    @param {Class} type
    @param {DS.Model} record
  */
  dataWasUpdated: function(type, record) {
    this.recordArrayManager.recordDidChange(record);
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
    @param {DS.Model} record
    @param {Resolver} resolver
  */
  scheduleSave: function(record, resolver) {
    record.adapterWillCommit();
    this._pendingSave.push([record, resolver]);
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

    forEach(pending, function(tuple) {
      var record = tuple[0], resolver = tuple[1];
      var adapter = this.adapterFor(record.constructor);
      var operation;

      if (get(record, 'currentState.stateName') === 'root.deleted.saved') {
        return resolver.resolve(record);
      } else if (get(record, 'isNew')) {
        operation = 'createRecord';
      } else if (get(record, 'isDeleted')) {
        operation = 'deleteRecord';
      } else {
        operation = 'updateRecord';
      }

      resolver.resolve(_commit(adapter, this, operation, record));
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
    @param {DS.Model} record the in-flight record
    @param {Object} data optional data (see above)
  */
  didSaveRecord: function(record, data) {
    if (data) {
      // normalize relationship IDs into records
      data = normalizeRelationships(this, record.constructor, data, record);
      setupRelationships(this, record, data);

      this.updateId(record, data);
    }

    record.adapterDidCommit(data);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected with a `DS.InvalidError`.

    @method recordWasInvalid
    @private
    @param {DS.Model} record
    @param {Object} errors
  */
  recordWasInvalid: function(record, errors) {
    record.adapterDidInvalidate(errors);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected (with anything other than a `DS.InvalidError`).

    @method recordWasError
    @private
    @param {DS.Model} record
  */
  recordWasError: function(record) {
    record.adapterDidError();
  },

  /**
    When an adapter's `createRecord`, `updateRecord` or `deleteRecord`
    resolves with data, this method extracts the ID from the supplied
    data.

    @method updateId
    @private
    @param {DS.Model} record
    @param {Object} data
  */
  updateId: function(record, data) {
    var oldId = get(record, 'id');
    var id = coerceId(data.id);

    Ember.assert("An adapter cannot assign a new id to a record that already has an id. " + record + " had id: " + oldId + " and you tried to update it with " + id + ". This likely happened because your server returned data in response to a find or update that had a different id than the one you sent.", oldId === null || id === oldId);

    this.typeMapFor(record.constructor).idToRecord[id] = record;

    set(record, 'id', id);
  },

  /**
    Returns a map of IDs to client IDs for a given type.

    @method typeMapFor
    @private
    @param {subclass of DS.Model} type
    @return {Object} typeMap
  */
  typeMapFor: function(type) {
    var typeMaps = get(this, 'typeMaps');
    var guid = Ember.guidFor(type);
    var typeMap;

    typeMap = typeMaps[guid];

    if (typeMap) { return typeMap; }

    typeMap = {
      idToRecord: Ember.create(null),
      records: [],
      metadata: Ember.create(null),
      type: type
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
    @param {String or subclass of DS.Model} type
    @param {Object} data
    @param {Boolean} partial the data should be merged into
      the existing data, not replace it.
  */
  _load: function(type, data, partial) {
    var id = coerceId(data.id);
    var record = this.recordForId(type, id);

    record.setupData(data, partial);
    this.recordArrayManager.recordDidChange(record);

    return record;
  },

  /**
    Returns a model class for a particular key. Used by
    methods that take a type key (like `find`, `createRecord`,
    etc.)

    @method modelFor
    @param {String or subclass of DS.Model} key
    @return {subclass of DS.Model}
  */
  modelFor: function(key) {
    var factory;

    if (typeof key === 'string') {
      factory = this.modelFactoryFor(key);
      if (!factory) {
        throw new Ember.Error("No model was found for '" + key + "'");
      }
      factory.typeKey = factory.typeKey || this._normalizeTypeKey(key);
    } else {
      // A factory already supplied. Ensure it has a normalized key.
      factory = key;
      if (factory.typeKey) {
        factory.typeKey = this._normalizeTypeKey(factory.typeKey);
      }
    }

    factory.store = this;
    return factory;
  },

  modelFactoryFor: function(key){
    return this.container.lookupFactory('model:' + key);
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

    ```js
    App.Person = DS.Model.extend({
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

    If you're streaming data or implementing an adapter,
    make sure that you have converted the incoming data
    into this form.

    This method can be used both to push in brand new
    records, as well as to update existing records.

    @method push
    @param {String or subclass of DS.Model} type
    @param {Object} data
    @return {DS.Model} the record that was created or
      updated.
  */
  push: function(typeName, data, _partial) {
    // _partial is an internal param used by `update`.
    // If passed, it means that the data should be
    // merged into the existing data, not replace it.
    Ember.assert("Expected an object as `data` in a call to `push`/`update` for " + typeName + " , but was " + data, Ember.typeOf(data) === 'object');
    Ember.assert("You must include an `id` for " + typeName + " in an object passed to `push`/`update`", data.id != null && data.id !== '');

    var type = this.modelFor(typeName);
    var filter = Ember.EnumerableUtils.filter;

    // If the payload contains relationships that are specified as
    // IDs, normalizeRelationships will convert them into DS.Model instances
    // (possibly unloaded) before we push the payload into the
    // store.

    data = normalizeRelationships(this, type, data);

    Ember.warn("The payload for '" + typeName + "' contains these unknown keys: " +
      Ember.inspect(filter(Ember.keys(data), function(key) {
        return !get(type, 'fields').has(key) && key !== 'id' && key !== 'links';
      })) + ". Make sure they've been defined in your model.",
      filter(Ember.keys(data), function(key) {
        return !get(type, 'fields').has(key) && key !== 'id' && key !== 'links';
      }).length === 0
    );

    // Actually load the record into the store.

    this._load(type, data, _partial);

    var record = this.recordForId(type, data.id);

    // Now that the pushed record as well as any related records
    // are in the store, create the data structures used to track
    // relationships.
    setupRelationships(this, record, data);

    return record;
  },

  /**
    Push some raw data into the store.

    This method can be used both to push in brand new
    records, as well as to update existing records. You
    can push in more than one type of object at once.
    All objects should be in the format expected by the
    serializer.

    ```js
    App.ApplicationSerializer = DS.ActiveModelSerializer;

    var pushData = {
      posts: [
        {id: 1, post_title: "Great post", comment_ids: [2]}
      ],
      comments: [
        {id: 2, comment_body: "Insightful comment"}
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

    ```js
    App.ApplicationSerializer = DS.ActiveModelSerializer;
    App.PostSerializer = DS.JSONSerializer;
    store.pushPayload('comment', pushData); // Will use the ApplicationSerializer
    store.pushPayload('post', pushData); // Will use the PostSerializer
    ```

    @method pushPayload
    @param {String} type Optionally, a model used to determine which serializer will be used
    @param {Object} payload
  */
  pushPayload: function (type, inputPayload) {
    var serializer;
    var payload;
    if (!inputPayload) {
      payload = type;
      serializer = defaultSerializer(this.container);
      Ember.assert("You cannot use `store#pushPayload` without a type unless your default serializer defines `pushPayload`", typeof serializer.pushPayload === 'function');
    } else {
      payload = inputPayload;
      serializer = this.serializerFor(type);
    }
    serializer.pushPayload(this, payload);
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
    @param {String} type The name of the model type for this payload
    @param {Object} payload
    @return {Object} The normalized payload
  */
  normalize: function (type, payload) {
    var serializer = this.serializerFor(type);
    var model = this.modelFor(type);
    return serializer.normalize(model, payload);
  },

  /**
    Update existing records in the store. Unlike [push](#method_push),
    update will merge the new data properties with the existing
    properties. This makes it safe to use with a subset of record
    attributes. This method expects normalized data.

    `update` is useful if your app broadcasts partial updates to
    records.

    ```js
    App.Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    store.get('person', 1).then(function(tom) {
      tom.get('firstName'); // Tom
      tom.get('lastName'); // Dale

      var updateEvent = {id: 1, firstName: "TomHuda"};
      store.update('person', updateEvent);

      tom.get('firstName'); // TomHuda
      tom.get('lastName'); // Dale
    });
    ```

    @method update
    @param {String} type
    @param {Object} data
    @return {DS.Model} the record that was updated.
  */
  update: function(type, data) {
    return this.push(type, data, true);
  },

  /**
    If you have an Array of normalized data to push,
    you can call `pushMany` with the Array, and it will
    call `push` repeatedly for you.

    @method pushMany
    @param {String or subclass of DS.Model} type
    @param {Array} datas
    @return {Array}
  */
  pushMany: function(type, datas) {
    var length = datas.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++) {
      result[i] = this.push(type, datas[i]);
    }

    return result;
  },

  /**
    If you have some metadata to set for a type
    you can call `metaForType`.

    @method metaForType
    @param {String or subclass of DS.Model} type
    @param {Object} metadata
  */
  metaForType: function(typeName, metadata) {
    var type = this.modelFor(typeName);

    Ember.merge(this.typeMapFor(type).metadata, metadata);
  },

  /**
    Build a brand new record for a given type, ID, and
    initial data.

    @method buildRecord
    @private
    @param {subclass of DS.Model} type
    @param {String} id
    @param {Object} data
    @return {DS.Model} record
  */
  buildRecord: function(type, id, data) {
    var typeMap = this.typeMapFor(type);
    var idToRecord = typeMap.idToRecord;

    Ember.assert('The id ' + id + ' has already been used with another record of type ' + type.toString() + '.', !id || !idToRecord[id]);
    Ember.assert("`" + Ember.inspect(type)+ "` does not appear to be an ember-data model", (typeof type._create === 'function') );

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    var record = type._create({
      id: id,
      store: this,
      container: this.container
    });

    if (data) {
      record.setupData(data);
    }

    // if we're creating an item, this process will be done
    // later, once the object has been persisted.
    if (id) {
      idToRecord[id] = record;
    }

    typeMap.records.push(record);

    return record;
  },

  // ...............
  // . DESTRUCTION .
  // ...............

  /**
    When a record is destroyed, this un-indexes it and
    removes it from any record arrays so it can be GCed.

    @method dematerializeRecord
    @private
    @param {DS.Model} record
  */
  dematerializeRecord: function(record) {
    var type = record.constructor;
    var typeMap = this.typeMapFor(type);
    var id = get(record, 'id');

    record.updateRecordArrays();

    if (id) {
      delete typeMap.idToRecord[id];
    }

    var loc = indexOf(typeMap.records, record);
    typeMap.records.splice(loc, 1);
  },

  // ......................
  // . PER-TYPE ADAPTERS
  // ......................

  /**
    Returns the adapter for a given type.

    @method adapterFor
    @private
    @param {subclass of DS.Model} type
    @return DS.Adapter
  */
  adapterFor: function(type) {
    var container = this.container, adapter;

    if (container) {
      adapter = container.lookup('adapter:' + type.typeKey) || container.lookup('adapter:application');
    }

    return adapter || get(this, 'defaultAdapter');
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

    If no `App.ApplicationSerializer` is found, it will fall back
    to an instance of `DS.JSONSerializer`.

    @method serializerFor
    @private
    @param {String} type the record to serialize
    @return {DS.Serializer}
  */
  serializerFor: function(type) {
    type = this.modelFor(type);
    var adapter = this.adapterFor(type);

    return serializerFor(this.container, type.typeKey, adapter && adapter.defaultSerializer);
  },

  willDestroy: function() {
    var typeMaps = this.typeMaps;
    var keys = Ember.keys(typeMaps);

    var types = map(keys, byType);

    this.recordArrayManager.destroy();

    forEach(types, this.unloadAll, this);

    function byType(entry) {
      return typeMaps[entry]['type'];
    }

  },

  /**
    All typeKeys are camelCase internally. Changing this function may
    require changes to other normalization hooks (such as typeForRoot).

    @method _normalizeTypeKey
    @private
    @param {String} type
    @return {String} if the adapter can generate one, an ID
  */
  _normalizeTypeKey: function(key) {
    return camelize(singularize(key));
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
  if (!Model) { Model = requireModule("ember-data/system/model")["Model"]; }
  if (isNone(id) || id instanceof Model) {
    return;
  }
  Ember.assert("A " + relationship.parentType + " record was pushed into the store with the value of " + key + " being " + Ember.inspect(id) + ", but " + key + " is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.", !Ember.isArray(id));

  var type;

  if (typeof id === 'number' || typeof id === 'string') {
    type = typeFor(relationship, key, data);
    data[key] = store.recordForId(type, id);
  } else if (typeof id === 'object') {
    // polymorphic
    data[key] = store.recordForId(id.type, id.id);
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


function serializerFor(container, type, defaultSerializer) {
  return container.lookup('serializer:'+type) ||
                 container.lookup('serializer:application') ||
                 container.lookup('serializer:' + defaultSerializer) ||
                 container.lookup('serializer:-default');
}

function defaultSerializer(container) {
  return container.lookup('serializer:application') ||
         container.lookup('serializer:-default');
}

function serializerForAdapter(adapter, type) {
  var serializer = adapter.serializer;
  var defaultSerializer = adapter.defaultSerializer;
  var container = adapter.container;

  if (container && serializer === undefined) {
    serializer = serializerFor(container, type.typeKey, defaultSerializer);
  }

  if (serializer === null || serializer === undefined) {
    serializer = {
      extract: function(store, type, payload) { return payload; }
    };
  }

  return serializer;
}

function _objectIsAlive(object) {
  return !(get(object, "isDestroyed") || get(object, "isDestroying"));
}

function _guard(promise, test) {
  var guarded = promise['finally'](function() {
    if (!test()) {
      guarded._subscribers.length = 0;
    }
  });

  return guarded;
}

function _bind(fn) {
  var args = Array.prototype.slice.call(arguments, 1);

  return function() {
    return fn.apply(undefined, args);
  };
}

function _find(adapter, store, type, id, record) {
  var promise = adapter.find(store, type, id, record);
  var serializer = serializerForAdapter(adapter, type);
  var label = "DS: Handle Adapter#find of " + type + " with id: " + id;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    Ember.assert("You made a request for a " + type.typeKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
    var payload = serializer.extract(store, type, adapterPayload, id, 'find');

    return store.push(type, payload);
  }, function(error) {
    var record = store.getById(type, id);
    if (record) {
      record.notFound();
    }
    throw error;
  }, "DS: Extract payload of '" + type + "'");
}


function _findMany(adapter, store, type, ids, records) {
  var promise = adapter.findMany(store, type, ids, records);
  var serializer = serializerForAdapter(adapter, type);
  var label = "DS: Handle Adapter#findMany of " + type;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var payload = serializer.extract(store, type, adapterPayload, null, 'findMany');

    Ember.assert("The response from a findMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    return store.pushMany(type, payload);
  }, null, "DS: Extract payload of " + type);
}

function _findHasMany(adapter, store, record, link, relationship) {
  var promise = adapter.findHasMany(store, record, link, relationship);
  var serializer = serializerForAdapter(adapter, relationship.type);
  var label = "DS: Handle Adapter#findHasMany of " + record + " : " + relationship.type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    var payload = serializer.extract(store, relationship.type, adapterPayload, null, 'findHasMany');

    Ember.assert("The response from a findHasMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    var records = store.pushMany(relationship.type, payload);
    return records;
  }, null, "DS: Extract payload of " + record + " : hasMany " + relationship.type);
}

function _findBelongsTo(adapter, store, record, link, relationship) {
  var promise = adapter.findBelongsTo(store, record, link, relationship);
  var serializer = serializerForAdapter(adapter, relationship.type);
  var label = "DS: Handle Adapter#findBelongsTo of " + record + " : " + relationship.type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    var payload = serializer.extract(store, relationship.type, adapterPayload, null, 'findBelongsTo');

    if (!payload) {
      return null;
    }

    var record = store.push(relationship.type, payload);
    return record;
  }, null, "DS: Extract payload of " + record + " : " + relationship.type);
}

function _findAll(adapter, store, type, sinceToken) {
  var promise = adapter.findAll(store, type, sinceToken);
  var serializer = serializerForAdapter(adapter, type);
  var label = "DS: Handle Adapter#findAll of " + type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var payload = serializer.extract(store, type, adapterPayload, null, 'findAll');

    Ember.assert("The response from a findAll must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    store.pushMany(type, payload);
    store.didUpdateAll(type);
    return store.all(type);
  }, null, "DS: Extract payload of findAll " + type);
}

function _findQuery(adapter, store, type, query, recordArray) {
  var promise = adapter.findQuery(store, type, query, recordArray);
  var serializer = serializerForAdapter(adapter, type);
  var label = "DS: Handle Adapter#findQuery of " + type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var payload = serializer.extract(store, type, adapterPayload, null, 'findQuery');

    Ember.assert("The response from a findQuery must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    recordArray.load(payload);
    return recordArray;
  }, null, "DS: Extract payload of findQuery " + type);
}

function _commit(adapter, store, operation, record) {
  var type = record.constructor;
  var promise = adapter[operation](store, type, record);
  var serializer = serializerForAdapter(adapter, type);
  var label = "DS: Extract and notify about " + operation + " completion of " + record;

  Ember.assert("Your adapter's '" + operation + "' method must return a value, but it returned `undefined", promise !==undefined);

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    var payload;

    if (adapterPayload) {
      payload = serializer.extract(store, type, adapterPayload, get(record, 'id'), operation);
    } else {
      payload = adapterPayload;
    }

    store.didSaveRecord(record, payload);
    return record;
  }, function(reason) {
    if (reason instanceof InvalidError) {
      var errors = serializer.extractErrors(store, type, reason.errors, get(record, 'id'));
      store.recordWasInvalid(record, errors);
      reason = new InvalidError(errors);
    } else {
      store.recordWasError(record, reason);
    }

    throw reason;
  }, label);
}

function setupRelationships(store, record, data) {
  var type = record.constructor;

  type.eachRelationship(function(key, descriptor) {
    var kind = descriptor.kind;
    var value = data[key];
    var relationship = record._relationships[key];

    if (data.links && data.links[key]) {
      relationship.updateLink(data.links[key]);
    }

    if (kind === 'belongsTo') {
      if (value === undefined) {
        return;
      }
      relationship.setRecord(value);
    } else if (kind === 'hasMany' && value) {
     relationship.updateRecordsFromAdapter(value);
    }
  });
}

export { Store };
export default Store;
