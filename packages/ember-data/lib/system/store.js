/*globals Ember*/
/*jshint eqnull:true*/

require("ember-data/system/record_arrays");
require("ember-data/system/mixins/mappable");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var once = Ember.run.once;
var isNone = Ember.isNone;
var forEach = Ember.EnumerableUtils.forEach;
var indexOf = Ember.EnumerableUtils.indexOf;
var map = Ember.EnumerableUtils.map;
var resolve = Ember.RSVP.resolve;

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
var coerceId = function(id) {
  return id == null ? null : id+'';
};

/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of DS.Model that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Define your application's store like this:

       MyApp.Store = DS.Store.extend();

  Most Ember.js applications will only have a single `DS.Store` that is
  automatically created by their `Ember.Application`.

  You can retrieve models from the store in several ways. To retrieve a record
  for a specific id, use `DS.Model`'s `find()` method:

       var person = App.Person.find(123);

  If your application has multiple `DS.Store` instances (an unusual case), you can
  specify which store should be used:

      var person = store.find(App.Person, 123);

  In general, you should retrieve models using the methods on `DS.Model`; you should
  rarely need to interact with the store directly.

  By default, the store will talk to your backend using a standard REST mechanism.
  You can customize how the store talks to your backend by specifying a custom adapter:

       MyApp.store = DS.Store.create({
         adapter: 'MyApp.CustomAdapter'
       });

  You can learn more about writing a custom adapter by reading the `DS.Adapter`
  documentation.

  @class Store
  @namespace DS
  @extends Ember.Object
  @uses DS._Mappable
*/
DS.Store = Ember.Object.extend(DS._Mappable, {

  /**
    @method init
    @private
  */
  init: function() {
    // internal bookkeeping; not observable
    this.typeMaps = {};
    this.recordArrayManager = DS.RecordArrayManager.create({
      store: this
    });
    this._relationshipChanges = {};
    this._pendingSave = [];
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
  adapter: '_rest',

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
    @returns DS.Adapter
  */
  defaultAdapter: Ember.computed(function() {
    var adapter = get(this, 'adapter');

    Ember.assert('You tried to set `adapter` property to an instance of `DS.Adapter`, where it should be a name or a factory', !(adapter instanceof DS.Adapter));

    if (typeof adapter === 'string') {
      adapter = this.container.lookup('adapter:' + adapter) || this.container.lookup('adapter:application') || this.container.lookup('adapter:_rest');
    }

    if (DS.Adapter.detect(adapter)) {
      adapter = adapter.create({ container: this.container });
    }

    return adapter;
  }).property('adapter'),

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
    @returns DS.Model
  */
  createRecord: function(type, properties) {
    type = this.modelFor(type);

    properties = properties || {};

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

    @method generateId
    @param {String} type
    @returns String if the adapter can generate one, an ID
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

    @method deleteRecord
    @param {DS.Model} record
  */
  deleteRecord: function(record) {
    record.deleteRecord();
  },

  /**
    For symmetry, a record can be unloaded via the store.

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

        store.find('person', 1);

    The `find` method will always return a **promise** that will be resolved
    with the record. If the record was already in the store, the promise will
    be resolved immediately. Otherwise, the store will ask the adapter's `find`
    method to find the necessary data.

    The `find` method will always resolve its promise with the same object for
    a given type and `id`.

    ---

    To find all records for a type, call `find` with no additional parameters:

        store.find('person');

    This will ask the adapter's `findAll` method to find the records for the
    given type, and return a promise that will be resolved once the server
    returns the values.

    ---

    To find a record by a query, call `find` with a hash as the second
    parameter:

        store.find(App.Person, { page: 1 });

    This will ask the adapter's `findQuery` method to find the records for
    the query, and return a promise that will be resolved once the server
    responds.

    @method find
    @param {DS.Model} type
    @param {Object|String|Integer|null} id
  */
  find: function(type, id) {
    if (id === undefined) {
      return this.findAll(type);
    }

    // We are passed a query instead of an id.
    if (Ember.typeOf(id) === 'object') {
      return this.findQuery(type, id);
    }

    return this.findById(type, coerceId(id));
  },

  /**
    This method returns a record for a given type and id combination.

    @method findById
    @private
    @param type
    @param id
  */
  findById: function(type, id) {
    type = this.modelFor(type);

    var record = this.recordForId(type, id);

    var promise = this.fetchRecord(record) || resolve(record);
    return promiseObject(promise);
  },

  /**
    This method makes a series of requests to the adapter's `find` method
    and returns a promise that resolves once they are all loaded.

    @method findByIds
    @param {String} type
    @param {Array} ids
    @returns Promise
  */
  findByIds: function(type, ids) {
    var store = this;

    return promiseArray(Ember.RSVP.all(map(ids, function(id) {
      return store.findById(type, id);
    })).then(function(array) {
      return Ember.A(array);
    }));
  },

  /**
    This method is called by `findById` if it discovers that a particular
    type/id pair hasn't been loaded yet to kick off a request to the
    adapter.

    @method fetchRecord
    @private
    @param {DS.Model} record
    @returns Promise
  */
  fetchRecord: function(record) {
    if (isNone(record)) { return null; }
    if (record._loadingPromise) { return record._loadingPromise; }
    if (!get(record, 'isEmpty')) { return null; }

    var type = record.constructor,
        id = get(record, 'id'),
        resolver = Ember.RSVP.defer();

    record.loadingData(resolver.promise);

    var adapter = this.adapterFor(type);

    Ember.assert("You tried to find a record but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to find a record but your adapter (for " + type + ") does not implement 'find'", adapter.find);

    _find(adapter, this, type, id, resolver);

    return resolver.promise;
  },

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it's available.
    Otherwise, it will return null.

    ```js
    var post = store.getById('post', 1);
    ```

    @method getById
    @param type
    @param id
  */
  getById: function(type, id) {
    type = this.modelFor(type);

    if (this.hasRecordForId(type, id)) {
      return this.recordForId(type, id);
    } else {
      return null;
    }
  },

  /**
    This method is called by the record's `reload` method. The record's `reload`
    passes in a resolver for the promise it returns.

    This method calls the adapter's `find` method, which returns a promise. When
    **that** promise resolves, `reloadRecord` will resolve the promise returned
    by the record's `reload`.

    @method reloadRecord
    @private
    @param {DS.Model} record
    @param {Resolver} resolver
  */
  reloadRecord: function(record, resolver) {
    var type = record.constructor,
        adapter = this.adapterFor(type),
        id = get(record, 'id');

    Ember.assert("You cannot reload a record without an ID", id);
    Ember.assert("You tried to reload a record but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to reload a record but your adapter does not implement `find`", adapter.find);

    return _find(adapter, this, type, id, resolver);
  },

  /**
    This method takes a list of records, groups the records by type,
    converts the records into IDs, and then invokes the adapter's `findMany`
    method.

    The records are grouped by type to invoke `findMany` on adapters
    for each unique type in records.

    It is used both by a brand new relationship (via the `findMany`
    method) or when the data underlying an existing relationship
    changes.

    @method fetchMany
    @private
    @param records
    @param owner
  */
  fetchMany: function(records, owner, resolver) {
    if (!records.length) { return; }

    // Group By Type
    var recordsByTypeMap = Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });

    forEach(records, function(record) {
      recordsByTypeMap.get(record.constructor).push(record);
    });

    forEach(recordsByTypeMap, function(type, records) {
      var ids = records.mapProperty('id'),
          adapter = this.adapterFor(type);

      Ember.assert("You tried to load many records but you have no adapter (for " + type + ")", adapter);
      Ember.assert("You tried to load many records but your adapter does not implement `findMany`", adapter.findMany);

      _findMany(adapter, this, type, ids, owner, resolver);
    }, this);
  },

  /**
    Returns true if a record for a given type and ID is already loaded.

    @method hasRecordForId
    @param {String} type
    @param {String|Integer} id
    @returns Boolean
  */
  hasRecordForId: function(type, id) {
    id = coerceId(id);

    return !!this.typeMapFor(type).idToRecord[id];
  },

  /**
    Returns id record for a given type and ID. If one isn't already loaded,
    it builds a new record and leaves it in the `empty` state.

    @method recordForId
    @param {String} type
    @param {String|Integer} id
    @returns DS.Model
  */
  recordForId: function(type, id) {
    type = this.modelFor(type);

    id = coerceId(id);

    var record = this.typeMapFor(type).idToRecord[id];

    if (!record) {
      record = this.buildRecord(type, id);
    }

    return record;
  },

  /**
    @method findMany
    @private
    @param {DS.Model} owner
    @param {Array<DS.Model>} records
    @param {String} type
    @param {Resolver} resolver
    @return DS.ManyArray
  */
  findMany: function(owner, records, type, resolver) {
    type = this.modelFor(type);

    records = Ember.A(records);

    var unloadedRecords = records.filterProperty('isEmpty', true),
        manyArray = this.recordArrayManager.createManyArray(type, records);

    forEach(unloadedRecords, function(record) {
      record.loadingData();
    });

    manyArray.loadingRecordsCount = unloadedRecords.length;

    if (unloadedRecords.length) {
      forEach(unloadedRecords, function(record) {
        this.recordArrayManager.registerWaitingRecordArray(record, manyArray);
      }, this);

      this.fetchMany(unloadedRecords, owner, resolver);
    } else {
      if (resolver) { resolver.resolve(); }
      manyArray.set('isLoaded', true);
      Ember.run.once(manyArray, 'trigger', 'didLoad');
    }

    return manyArray;
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
    @param {String} type
    @param {Resolver} resolver
    @return DS.ManyArray
  */
  findHasMany: function(owner, link, relationship, resolver) {
    var adapter = this.adapterFor(owner.constructor);

    Ember.assert("You tried to load a hasMany relationship but you have no adapter (for " + owner.constructor + ")", adapter);
    Ember.assert("You tried to load a hasMany relationship from a specified `link` in the original payload but your adapter does not implement `findHasMany`", adapter.findHasMany);

    var records = this.recordArrayManager.createManyArray(relationship.type, Ember.A([]));
    _findHasMany(adapter, this, owner, link, relationship, resolver);
    return records;
  },

  findBelongsTo: function(owner, link, relationship, resolver) {
    var adapter = this.adapterFor(owner.constructor);

    Ember.assert("You tried to load a belongsTo relationship but you have no adapter (for " + owner.constructor + ")", adapter);
    Ember.assert("You tried to load a belongsTo relationship from a specified `link` in the original payload but your adapter does not implement `findBelongsTo`", adapter.findBelongsTo);

    _findBelongsTo(adapter, this, owner, link, relationship, resolver);
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
    @param {String} type
    @param {any} query an opaque query to be used by the adapter
    @return Promise
  */
  findQuery: function(type, query) {
    type = this.modelFor(type);

    var array = DS.AdapterPopulatedRecordArray.create({
      type: type,
      query: query,
      content: Ember.A(),
      store: this
    });

    var adapter = this.adapterFor(type),
        resolver = Ember.RSVP.defer();

    Ember.assert("You tried to load a query but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to load a query but your adapter does not implement `findQuery`", adapter.findQuery);

    _findQuery(adapter, this, type, query, array, resolver);

    return promiseArray(resolver.promise);
  },

  /**
    This method returns an array of all records adapter can find.
    It triggers the adapter's `findAll` method to give it an opportunity to populate
    the array with records of that type.

    @method findAll
    @private
    @param {Class} type
    @return {DS.AdapterPopulatedRecordArray}
  */
  findAll: function(type) {
    type = this.modelFor(type);

    return this.fetchAll(type, this.all(type));
  },

  /**
    @method fetchAll
    @private
    @param type
    @param array
    @returns Promise
  */
  fetchAll: function(type, array) {
    var adapter = this.adapterFor(type),
        sinceToken = this.typeMapFor(type).metadata.since,
        resolver = Ember.RSVP.defer();

    set(array, 'isUpdating', true);

    Ember.assert("You tried to load all records but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to load all records but your adapter does not implement `findAll`", adapter.findAll);

    _findAll(adapter, this, type, sinceToken, resolver);

    return promiseArray(resolver.promise);
  },

  /**
    @method didUpdateAll
    @param type
  */
  didUpdateAll: function(type) {
    var findAllCache = this.typeMapFor(type).findAllCache;
    set(findAllCache, 'isUpdating', false);
  },

  /**
    This method returns a filtered array that contains all of the known records
    for a given type.

    Note that because it's just a filter, it will have any locally
    created records of the type.

    Also note that multiple calls to `all` for a given type will always
    return the same RecordArray.

    @method all
    @param {Class} type
    @return {DS.RecordArray}
  */
  all: function(type) {
    type = this.modelFor(type);

    var typeMap = this.typeMapFor(type),
        findAllCache = typeMap.findAllCache;

    if (findAllCache) { return findAllCache; }

    var array = DS.RecordArray.create({
      type: type,
      content: Ember.A(),
      store: this,
      isLoaded: true
    });

    this.recordArrayManager.registerFilteredRecordArray(array, type);

    typeMap.findAllCache = array;
    return array;
  },


  /**
    This method unloads all of the known records for a given type.

    @method unloadAll
    @param {Class} type
  */
  unloadAll: function(type) {
    type = this.modelFor(type);

    var typeMap = this.typeMapFor(type),
        records = typeMap.records, record;

    while(record = records.pop()) {
      record.unloadRecord();
    }
  },

  /**
    Takes a type and filter function, and returns a live RecordArray that
    remains up to date as new records are loaded into the store or created
    locally.

    The callback function takes a materialized record, and returns true
    if the record should be included in the filter and false if it should
    not.

    The filter function is called once on all records for the type when
    it is created, and then once on each newly loaded or created record.

    If any of a record's properties change, or if it changes state, the
    filter function will be invoked again to determine whether it should
    still be in the array.

    @method filter
    @param {Class} type
    @param {Function} filter
    @return {DS.FilteredRecordArray}
  */
  filter: function(type, query, filter) {
    var promise;

    // allow an optional server query
    if (arguments.length === 3) {
      promise = this.findQuery(type, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    type = this.modelFor(type);

    var array = DS.FilteredRecordArray.create({
      type: type,
      content: Ember.A(),
      store: this,
      manager: this.recordArrayManager,
      filterFunction: filter
    });

    this.recordArrayManager.registerFilteredRecordArray(array, type, filter);

    if (promise) {
      return promise.then(function() { return array; });
    } else {
      return array;
    }
  },

  /**
    This method returns if a certain record is already loaded
    in the store. Use this function to know beforehand if a find()
    will result in a request or that it will be a cache hit.

    @method recordIsLoaded
    @param {Class} type
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
    @param {string} type
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
    @param {Number|String} clientId
    @param {DS.Model} record
  */
  dataWasUpdated: function(type, record) {
    // Because data updates are invoked at the end of the run loop,
    // it is possible that a record might be deleted after its data
    // has been modified and this method was scheduled to be called.
    //
    // If that's the case, the record would have already been removed
    // from all record arrays; calling updateRecordArrays would just
    // add it back. If the record is deleted, just bail. It shouldn't
    // give us any more trouble after this.

    if (get(record, 'isDeleted')) { return; }

    if (get(record, 'isLoaded')) {
      this.recordArrayManager.recordDidChange(record);
    }
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
      var record = tuple[0], resolver = tuple[1],
          adapter = this.adapterFor(record.constructor),
          operation;

      if (get(record, 'isNew')) {
        operation = 'createRecord';
      } else if (get(record, 'isDeleted')) {
        operation = 'deleteRecord';
      } else {
        operation = 'updateRecord';
      }

      _commit(adapter, this, operation, record, resolver);
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
    var oldId = get(record, 'id'),
        id = coerceId(data.id);

    Ember.assert("An adapter cannot assign a new id to a record that already has an id. " + record + " had id: " + oldId + " and you tried to update it with " + id + ". This likely happened because your server returned data in response to a find or update that had a different id than the one you sent.", oldId === null || id === oldId);

    this.typeMapFor(record.constructor).idToRecord[id] = record;

    set(record, 'id', id);
  },

  /**
    Returns a map of IDs to client IDs for a given type.

    @method typeMapFor
    @private
    @param type
  */
  typeMapFor: function(type) {
    var typeMaps = get(this, 'typeMaps'),
        guid = Ember.guidFor(type),
        typeMap;

    typeMap = typeMaps[guid];

    if (typeMap) { return typeMap; }

    typeMap = {
      idToRecord: {},
      records: [],
      metadata: {}
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
    @param {DS.Model} type
    @param {Object} data
    @param {Boolean} partial the data should be merged into
      the existing data, not replace it.
  */
  _load: function(type, data, partial) {
    var id = coerceId(data.id),
        record = this.recordForId(type, id);

    record.setupData(data, partial);
    this.recordArrayManager.recordDidChange(record);

    return record;
  },

  /**
    Returns a model class for a particular key. Used by
    methods that take a type key (like `find`, `createRecord`,
    etc.)

    @method modelFor
    @param {String} key
    @returns {subclass of DS.Model}
  */
  modelFor: function(key) {
    if (typeof key !== 'string') {
      return key;
    }

    var factory = this.container.lookupFactory('model:'+key);

    Ember.assert("No model was found for '" + key + "'", factory);

    factory.store = this;
    factory.typeKey = key;

    return factory;
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
    @param {String} type
    @param {Object} data
    @returns DS.Model the record that was created or
      updated.
  */
  push: function(type, data, _partial) {
    // _partial is an internal param used by `update`.
    // If passed, it means that the data should be
    // merged into the existing data, not replace it.

    Ember.assert("You must include an `id` in a hash passed to `push`", data.id != null);

    type = this.modelFor(type);

    // normalize relationship IDs into records
    data = normalizeRelationships(this, type, data);

    this._load(type, data, _partial);

    return this.recordForId(type, data.id);
  },

  /**
    Push some raw data into the store.

    The data will be automatically deserialized using the
    serializer for the `type` param.

    This method can be used both to push in brand new
    records, as well as to update existing records.

    You can push in more than one type of object at once.
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

    store.pushPayload('post', pushData);
    ```

    @method push
    @param {String} type
    @param {Object} payload
  */

  pushPayload: function (type, payload) {
    var serializer = this.serializerFor(type);
    serializer.pushPayload(this, payload);
  },

  update: function(type, data) {
    Ember.assert("You must include an `id` in a hash passed to `update`", data.id != null);

    return this.push(type, data, true);
  },

  /**
    If you have an Array of normalized data to push,
    you can call `pushMany` with the Array, and it will
    call `push` repeatedly for you.

    @method pushMany
    @param {String} type
    @param {Array} datas
    @return {Array<DS.Model>}
  */
  pushMany: function(type, datas) {
    return map(datas, function(data) {
      return this.push(type, data);
    }, this);
  },

  /**
    If you have some metadata to set for a type
    you can call `metaForType`.

    @method metaForType
    @param {String} type
    @param {Object} metadata
  */
  metaForType: function(type, metadata) {
    type = this.modelFor(type);

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
    @returns DS.Model
  */
  buildRecord: function(type, id, data) {
    var typeMap = this.typeMapFor(type),
        idToRecord = typeMap.idToRecord;

    Ember.assert('The id ' + id + ' has already been used with another record of type ' + type.toString() + '.', !id || !idToRecord[id]);

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
    var type = record.constructor,
        typeMap = this.typeMapFor(type),
        id = get(record, 'id');

    record.updateRecordArrays();

    if (id) {
      delete typeMap.idToRecord[id];
    }

    var loc = indexOf(typeMap.records, record);
    typeMap.records.splice(loc, 1);
  },

  // ........................
  // . RELATIONSHIP CHANGES .
  // ........................

  addRelationshipChangeFor: function(childRecord, childKey, parentRecord, parentKey, change) {
    var clientId = childRecord.clientId,
        parentClientId = parentRecord ? parentRecord : parentRecord;
    var key = childKey + parentKey;
    var changes = this._relationshipChanges;
    if (!(clientId in changes)) {
      changes[clientId] = {};
    }
    if (!(parentClientId in changes[clientId])) {
      changes[clientId][parentClientId] = {};
    }
    if (!(key in changes[clientId][parentClientId])) {
      changes[clientId][parentClientId][key] = {};
    }
    changes[clientId][parentClientId][key][change.changeType] = change;
  },

  removeRelationshipChangeFor: function(clientRecord, childKey, parentRecord, parentKey, type) {
    var clientId = clientRecord.clientId,
        parentClientId = parentRecord ? parentRecord.clientId : parentRecord;
    var changes = this._relationshipChanges;
    var key = childKey + parentKey;
    if (!(clientId in changes) || !(parentClientId in changes[clientId]) || !(key in changes[clientId][parentClientId])){
      return;
    }
    delete changes[clientId][parentClientId][key][type];
  },

  relationshipChangePairsFor: function(record){
    var toReturn = [];

    if( !record ) { return toReturn; }

    //TODO(Igor) What about the other side
    var changesObject = this._relationshipChanges[record.clientId];
    for (var objKey in changesObject){
      if(changesObject.hasOwnProperty(objKey)){
        for (var changeKey in changesObject[objKey]){
          if(changesObject[objKey].hasOwnProperty(changeKey)){
            toReturn.push(changesObject[objKey][changeKey]);
          }
        }
      }
    }
    return toReturn;
  },

  // ......................
  // . PER-TYPE ADAPTERS
  // ......................

  /**
    Returns the adapter for a given type.

    @method adapterFor
    @private
    @param {subclass of DS.Model} type
    @returns DS.Adapter
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
  */
  serializerFor: function(type) {
    type = this.modelFor(type);
    var adapter = this.adapterFor(type);

    return serializerFor(this.container, type.typeKey, adapter && adapter.defaultSerializer);
  }
});

function normalizeRelationships(store, type, data, record) {
  type.eachRelationship(function(key, relationship) {
    // A link (usually a URL) was already provided in
    // normalized form
    if (data.links && data.links[key]) {
      if (record && relationship.options.async) { record._relationships[key] = null; }
      return;
    }

    var kind = relationship.kind,
        value = data[key];

    if (value == null) { return; }

    if (kind === 'belongsTo') {
      deserializeRecordId(store, data, key, relationship, value);
    } else if (kind === 'hasMany') {
      deserializeRecordIds(store, data, key, relationship, value);
    }
  });

  return data;
}

function deserializeRecordId(store, data, key, relationship, id) {
  if (isNone(id) || id instanceof DS.Model) {
    return;
  }

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
  for (var i=0, l=ids.length; i<l; i++) {
    deserializeRecordId(store, ids, i, relationship, ids[i]);
  }
}

// Delegation to the adapter and promise management

DS.PromiseArray = Ember.ArrayProxy.extend(Ember.PromiseProxyMixin);
DS.PromiseObject = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

function promiseObject(promise) {
  return DS.PromiseObject.create({ promise: promise });
}

function promiseArray(promise) {
  return DS.PromiseArray.create({ promise: promise });
}

function isThenable(object) {
  return object && typeof object.then === 'function';
}

function serializerFor(container, type, defaultSerializer) {
  return container.lookup('serializer:'+type) ||
                 container.lookup('serializer:application') ||
                 container.lookup('serializer:' + defaultSerializer) ||
                 container.lookup('serializer:_default');
}

function serializerForAdapter(adapter, type) {
  var serializer = adapter.serializer,
      defaultSerializer = adapter.defaultSerializer,
      container = adapter.container;

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

function _find(adapter, store, type, id, resolver) {
  var promise = adapter.find(store, type, id),
      serializer = serializerForAdapter(adapter, type);

  return resolve(promise).then(function(payload) {
    Ember.assert("You made a request for a " + type.typeKey + " with id " + id + ", but the adapter's response did not have any data", payload);
    payload = serializer.extract(store, type, payload, id, 'find');

    return store.push(type, payload);
  }, function(error) {
    var record = store.getById(type, id);
    record.notFound();
    throw error;
  }).then(resolver.resolve, resolver.reject);
}

function _findMany(adapter, store, type, ids, owner, resolver) {
  var promise = adapter.findMany(store, type, ids, owner),
      serializer = serializerForAdapter(adapter, type);

  return resolve(promise).then(function(payload) {
    payload = serializer.extract(store, type, payload, null, 'findMany');

    Ember.assert("The response from a findMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    store.pushMany(type, payload);
  }).then(resolver.resolve, resolver.reject);
}

function _findHasMany(adapter, store, record, link, relationship, resolver) {
  var promise = adapter.findHasMany(store, record, link, relationship),
      serializer = serializerForAdapter(adapter, relationship.type);

  return resolve(promise).then(function(payload) {
    payload = serializer.extract(store, relationship.type, payload, null, 'findHasMany');

    Ember.assert("The response from a findHasMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    var records = store.pushMany(relationship.type, payload);
    record.updateHasMany(relationship.key, records);
  }).then(resolver.resolve, resolver.reject);
}

function _findBelongsTo(adapter, store, record, link, relationship, resolver) {
  var promise = adapter.findBelongsTo(store, record, link, relationship),
      serializer = serializerForAdapter(adapter, relationship.type);

  return resolve(promise).then(function(payload) {
    payload = serializer.extract(store, relationship.type, payload, null, 'findBelongsTo');

    var record = store.push(relationship.type, payload);
    record.updateBelongsTo(relationship.key, record);
  }).then(resolver.resolve, resolver.reject);
}

function _findAll(adapter, store, type, sinceToken, resolver) {
  var promise = adapter.findAll(store, type, sinceToken),
      serializer = serializerForAdapter(adapter, type);

  return resolve(promise).then(function(payload) {
    payload = serializer.extract(store, type, payload, null, 'findAll');

    Ember.assert("The response from a findAll must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    store.pushMany(type, payload);
    store.didUpdateAll(type);
    return store.all(type);
  }).then(resolver.resolve, resolver.reject);
}

function _findQuery(adapter, store, type, query, recordArray, resolver) {
  var promise = adapter.findQuery(store, type, query, recordArray),
      serializer = serializerForAdapter(adapter, type);

  return resolve(promise).then(function(payload) {
    payload = serializer.extract(store, type, payload, null, 'findAll');

    Ember.assert("The response from a findQuery must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

    recordArray.load(payload);
    return recordArray;
  }).then(resolver.resolve, resolver.reject);
}

function _commit(adapter, store, operation, record, resolver) {
  var type = record.constructor,
      promise = adapter[operation](store, type, record),
      serializer = serializerForAdapter(adapter, type);

  Ember.assert("Your adapter's '" + operation + "' method must return a promise, but it returned " + promise, isThenable(promise));

  return promise.then(function(payload) {
    if (payload) { payload = serializer.extract(store, type, payload, get(record, 'id'), operation); }
    store.didSaveRecord(record, payload);
    return record;
  }, function(reason) {
    if (reason instanceof DS.InvalidError) {
      store.recordWasInvalid(record, reason.errors);
    } else {
      store.recordWasError(record, reason);
    }

    throw reason;
  }).then(resolver.resolve, resolver.reject);
}
