/*globals Ember*/
/*jshint eqnull:true*/

require("ember-data/system/record_arrays");
require("ember-data/system/transaction");
require("ember-data/system/mixins/mappable");

/**
  @module data
  @submodule data-store
*/

var get = Ember.get, set = Ember.set, once = Ember.run.once;
var forEach = Ember.EnumerableUtils.forEach;

// These values are used in the data cache when clientIds are
// needed but the underlying data has not yet been loaded by
// the server.
var UNLOADED = 'unloaded';
var LOADING = 'loading';
var MATERIALIZED = { materialized: true };
var CREATED = { created: true };

// Implementors Note:
//
//   The variables in this file are consistently named according to the following
//   scheme:
//
//   * +id+ means an identifier managed by an external source, provided inside
//     the data provided by that source.
//   * +clientId+ means a transient numerical identifier generated at runtime by
//     the data store. It is important primarily because newly created objects may
//     not yet have an externally generated id.
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

var map = Ember.EnumerableUtils.map;

/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of DS.Model that wraps
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Create a new store like this:

       MyApp.store = DS.Store.create();

  You can retrieve DS.Model instances from the store in several ways. To retrieve
  a record for a specific id, use the `find()` method:

       var record = MyApp.store.find(MyApp.Contact, 123);

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
  @constructor
*/
DS.Store = Ember.Object.extend(DS._Mappable, {

  /**
    Many methods can be invoked without specifying which store should be used.
    In those cases, the first store created will be used as the default. If
    an application has multiple stores, it should specify which store to use
    when performing actions, such as finding records by id.

    The init method registers this store as the default if none is specified.
  */
  init: function() {
    // Enforce API revisioning. See BREAKING_CHANGES.md for more.
    var revision = get(this, 'revision');

    if (revision !== DS.CURRENT_API_REVISION && !Ember.ENV.TESTING) {
      throw new Error("Error: The Ember Data library has had breaking API changes since the last time you updated the library. Please review the list of breaking changes at https://github.com/emberjs/data/blob/master/BREAKING_CHANGES.md, then update your store's `revision` property to " + DS.CURRENT_API_REVISION);
    }

    if (!get(DS, 'defaultStore') || get(this, 'isDefaultStore')) {
      set(DS, 'defaultStore', this);
    }

    // internal bookkeeping; not observable
    this.typeMaps = {};
    this.recordCache = [];
    this.clientIdToId = {};
    this.clientIdToType = {};
    this.clientIdToData = {};
    this.clientIdToPrematerializedData = {};
    this.recordArraysByClientId = {};
    this.relationshipChanges = {};
    this.recordReferences = {};

    // Internally, we maintain a map of all unloaded IDs requested by
    // a ManyArray. As the adapter loads data into the store, the
    // store notifies any interested ManyArrays. When the ManyArray's
    // total number of loading records drops to zero, it becomes
    // `isLoaded` and fires a `didLoad` event.
    this.loadingRecordArrays = {};

    this._recordsToSave = Ember.OrderedSet.create();

    set(this, 'defaultTransaction', this.transaction());
  },

  /**
    Returns a new transaction scoped to this store. This delegates
    responsibility for invoking the adapter's commit mechanism to
    a transaction.

    Transaction are responsible for tracking changes to records
    added to them, and supporting `commit` and `rollback`
    functionality. Committing a transaction invokes the store's
    adapter, while rolling back a transaction reverses all
    changes made to records added to the transaction.

    A store has an implicit (default) transaction, which tracks changes
    made to records not explicitly added to a transaction.

    @see {DS.Transaction}
    @returns DS.Transaction
  */
  transaction: function() {
    return DS.Transaction.create({ store: this });
  },

  ensureSameTransaction: function(records){
    var transactions = Ember.A();
    forEach( records, function(record){
      if (record){ transactions.pushObject(get(record, 'transaction')); }
    });

    var transaction = transactions.reduce(function(prev, t) {
      if (!get(t, 'isDefault')) {
        if (prev === null) { return t; }
        Ember.assert("All records in a changed relationship must be in the same transaction. You tried to change the relationship between records when one is in " + t + " and the other is in " + prev, t === prev);
      }

      return prev;
    }, null);

    if (transaction) {
      forEach( records, function(record){
        if (record){ transaction.add(record); }
      });
    } else {
      transaction = transactions.objectAt(0);
    }
    return transaction;

   },
  /**
    @private

    Instructs the store to materialize the data for a given record.

    To materialize a record, the store first retrieves the opaque data that was
    passed to either `load()` or `loadMany()`. Then, the data and the record
    are passed to the adapter's `materialize()` method, which allows the adapter
    to translate arbitrary data structures from the adapter into the normalized
    form the record expects.

    The adapter's `materialize()` method will invoke `materializeAttribute()`,
    `materializeHasMany()` and `materializeBelongsTo()` on the record to
    populate it with normalized values.

    @param {DS.Model} record
  */
  materializeData: function(record) {
    var clientId = get(record, 'clientId'),
        cidToData = this.clientIdToData,
        adapter = this.adapterForType(record.constructor),
        data = cidToData[clientId];

    cidToData[clientId] = MATERIALIZED;

    var prematerialized = this.clientIdToPrematerializedData[clientId];

    // Ensures the record's data structures are setup
    // before being populated by the adapter.
    record.setupData();

    if (data !== CREATED) {
      // Instructs the adapter to extract information from the
      // opaque data and materialize the record's attributes and
      // relationships.
      adapter.materialize(record, data, prematerialized);
    }
  },

  /**
    @private

    Returns true if there is already a record for this clientId.

    This is used to determine whether cleanup is required, so that
    "changes" to unmaterialized records do not trigger mass
    materialization.

    For example, if a parent record in a relationship with a large
    number of children is deleted, we want to avoid materializing
    those children.

    @param {Object} reference
    @return {Boolean}
  */
  recordIsMaterialized: function(reference) {
    return !!this.recordCache[reference.clientId];
  },

  /**
    The adapter to use to communicate to a backend server or other persistence layer.

    This can be specified as an instance, a class, or a property path that specifies
    where the adapter can be located.

    @property {DS.Adapter|String}
  */
  adapter: 'DS.RESTAdapter',

  /**
    @private

    Returns a JSON representation of the record using the adapter's
    serialization strategy. This method exists primarily to enable
    a record, which has access to its store (but not the store's
    adapter) to provide a `serialize()` convenience.

    The available options are:

    * `includeId`: `true` if the record's ID should be included in
      the JSON representation

    @param {DS.Model} record the record to serialize
    @param {Object} options an options hash
  */
  serialize: function(record, options) {
    return this.adapterForType(record.constructor).serialize(record, options);
  },

  /**
    @private

    This property returns the adapter, after resolving a possible
    property path.

    If the supplied `adapter` was a class, or a String property
    path resolved to a class, this property will instantiate the
    class.

    This property is cacheable, so the same instance of a specified
    adapter class should be used for the lifetime of the store.

    @returns DS.Adapter
  */
  _adapter: Ember.computed(function() {
    var adapter = get(this, 'adapter');
    if (typeof adapter === 'string') {
      adapter = get(this, adapter, false) || get(Ember.lookup, adapter);
    }

    if (DS.Adapter.detect(adapter)) {
      adapter = adapter.create();
    }

    return adapter;
  }).property('adapter'),

  /**
    @private

    A monotonically increasing number to be used to uniquely identify
    data and records.

    It starts at 1 so other parts of the code can test for truthiness
    when provided a `clientId` instead of having to explicitly test
    for undefined.
  */
  clientIdCounter: 1,

  // .....................
  // . CREATE NEW RECORD .
  // .....................

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    Note: The third `transaction` property is for internal use only.
    If you want to create a record inside of a given transaction,
    use `transaction.createRecord()` instead of `store.createRecord()`.

    @method createRecord
    @param {subclass of DS.Model} type
    @param {Object} properties a hash of properties to set on the
      newly created record.
    @returns DS.Model
  */
  createRecord: function(type, properties, transaction) {
    properties = properties || {};

    // Create a new instance of the model `type` and put it
    // into the specified `transaction`. If no transaction is
    // specified, the default transaction will be used.
    var record = type._create({
      store: this
    });

    transaction = transaction || get(this, 'defaultTransaction');

    // adoptRecord is an internal API that allows records to move
    // into a transaction without assertions designed for app
    // code. It is used here to ensure that regardless of new
    // restrictions on the use of the public `transaction.add()`
    // API, we will always be able to insert new records into
    // their transaction.
    transaction.adoptRecord(record);

    // `id` is a special property that may not be a `DS.attr`
    var id = properties.id;

    // If the passed properties do not include a primary key,
    // give the adapter an opportunity to generate one. Typically,
    // client-side ID generators will use something like uuid.js
    // to avoid conflicts.
    var adapter;
    if (Ember.isNone(id)) {
      adapter = this.adapterForType(type);
      if (adapter && adapter.generateIdForRecord) {
        id = coerceId(adapter.generateIdForRecord(this, record));
        properties.id = id;
      }
    }

    id = coerceId(id);

    // Create a new `clientId` and associate it with the
    // specified (or generated) `id`. Since we don't have
    // any data for the server yet (by definition), store
    // the sentinel value CREATED as the data for this
    // clientId. If we see this value later, we will skip
    // materialization.
    var clientId = this.pushData(CREATED, id, type);

    // Now that we have a clientId, attach it to the record we
    // just created.
    set(record, 'clientId', clientId);

    // Move the record out of its initial `empty` state into
    // the `loaded` state.
    record.loadedData();

    // Make sure the data is set up so the record doesn't
    // try to materialize its nonexistent data.
    record.setupData();

    // Store the record we just created in the record cache for
    // this clientId.
    this.recordCache[clientId] = record;

    // Set the properties specified on the record.
    record.setProperties(properties);

    // Resolve record promise
    Ember.run(record, 'resolve');

    return record;
  },

  // .................
  // . DELETE RECORD .
  // .................

  /**
    For symmetry, a record can be deleted via the store.

    @param {DS.Model} record
  */
  deleteRecord: function(record) {
    record.deleteRecord();
  },

  /**
    For symmetry, a record can be unloaded via the store.

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
    this method is always a subclass of `DS.Model`.

    You can use the `find` method on a subclass of `DS.Model` directly if your
    application only has one store. For example, instead of
    `store.find(App.Person, 1)`, you could say `App.Person.find(1)`.

    ---

    To find a record by ID, pass the `id` as the second parameter:

        store.find(App.Person, 1);
        App.Person.find(1);

    If the record with that `id` had not previously been loaded, the store will
    return an empty record immediately and ask the adapter to find the data by
    calling the adapter's `find` method.

    The `find` method will always return the same object for a given type and
    `id`. To check whether the adapter has populated a record, you can check
    its `isLoaded` property.

    ---

    To find all records for a type, call `find` with no additional parameters:

        store.find(App.Person);
        App.Person.find();

    This will return a `RecordArray` representing all known records for the
    given type and kick off a request to the adapter's `findAll` method to load
    any additional records for the type.

    The `RecordArray` returned by `find()` is live. If any more records for the
    type are added at a later time through any mechanism, it will automatically
    update to reflect the change.

    ---

    To find a record by a query, call `find` with a hash as the second
    parameter:

        store.find(App.Person, { page: 1 });
        App.Person.find({ page: 1 });

    This will return a `RecordArray` immediately, but it will always be an
    empty `RecordArray` at first. It will call the adapter's `findQuery`
    method, which will populate the `RecordArray` once the server has returned
    results.

    You can check whether a query results `RecordArray` has loaded by checking
    its `isLoaded` property.

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
    @private

    This method returns a record for a given type and id combination.

    If the store has never seen this combination of type and id before, it
    creates a new `clientId` with the LOADING sentinel and asks the adapter to
    load the data.

    If the store has seen the combination, this method delegates to
    `getByReference`.
  */
  findById: function(type, id) {
    var clientId = this.typeMapFor(type).idToCid[id];

    // A record can have a reference without being loaded
    // (through a hasMany relationship). In that case, we need to
    // materialize the record.
    if (clientId && this.clientIdToData[clientId] !== UNLOADED) {
      return this.findByClientId(type, clientId);
    }

    clientId = this.pushData(LOADING, id, type);

    // create a new instance of the model type in the
    // 'isLoading' state
    var record = this.materializeRecord(type, clientId, id);

    // let the adapter set the data, possibly async
    var adapter = this.adapterForType(type);

    Ember.assert("You tried to find a record but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to find a record but your adapter does not implement `find`", adapter.find);

    adapter.find(this, type, id);

    return record;
  },

  reloadRecord: function(record) {
    var type = record.constructor,
        adapter = this.adapterForType(type),
        id = get(record, 'id');

    Ember.assert("You cannot update a record without an ID", id);
    Ember.assert("You tried to update a record but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to update a record but your adapter does not implement `find`", adapter.find);

    adapter.find(this, type, id);
  },

  /**
    @private

    This method returns a record for a given clientId.

    If there is no record object yet for the clientId, this method materializes
    a new record object. This allows adapters to eagerly load large amounts of
    data into the store, and avoid incurring the cost to create the objects
    until they are requested.

    Several parts of Ember Data call this method:

    * findById, if a clientId already exists for a given type and
      id combination
    * OneToManyChange, which is backed by clientIds, when getChild,
      getOldParent or getNewParent are called
    * RecordArray, which is backed by clientIds, when an object at
      a particular index is looked up

    In short, it's a convenient way to get a record for a known
    clientId, materializing it if necessary.

    @param {Class} type
    @param {Number|String} clientId
  */
  findByClientId: function(type, clientId) {
    var cidToData, record, id;

    record = this.recordCache[clientId];

    if (!record) {
      // create a new instance of the model type in the
      // 'isLoading' state
      id = this.clientIdToId[clientId];
      record = this.materializeRecord(type, clientId, id);

      cidToData = this.clientIdToData;

      if (typeof cidToData[clientId] === 'object') {
        record.loadedData();
      }
    }

    return record;
  },

  /**
    @private

    Given an array of `reference`s, determines which of those
    `clientId`s has not yet been loaded.

    In preparation for loading, this method also marks any unloaded
    `clientId`s as loading.
  */
  neededReferences: function(references) {
    var neededReferences = [],
        cidToData = this.clientIdToData,
        reference;

    for (var i=0, l=references.length; i<l; i++) {
      reference = references[i];

      if (cidToData[reference.clientId] === UNLOADED) {
        neededReferences.push(reference);
        cidToData[reference.clientId] = LOADING;
      }
    }

    return neededReferences;
  },

  /**
    @private

    This method is the entry point that relationships use to update
    themselves when their underlying data changes.

    First, it determines which of its `reference`s are still unloaded,
    then invokes `findMany` on the adapter.
  */
  fetchUnloadedReferences: function(references, owner) {
    var neededReferences = this.neededReferences(references);
    this.fetchMany(neededReferences, owner);
  },

  /**
    @private

    This method takes a list of `reference`s, group the `reference`s by type,
    converts the `reference`s into IDs, and then invokes the adapter's `findMany`
    method.
    The `reference`s are grouped by type to invoke `findMany` on adapters
    for each unique type in `reference`s.

    It is used both by a brand new relationship (via the `findMany`
    method) or when the data underlying an existing relationship
    changes (via the `fetchUnloadedReferences` method).
  */
  fetchMany: function(references, owner) {
    if (!references.length) { return; }

    // Group By Type
    var referencesByTypeMap = Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });
    forEach(references, function(reference) {
      referencesByTypeMap.get(reference.type).push(reference);
    });

    forEach(referencesByTypeMap, function(type) {
      var references = referencesByTypeMap.get(type),
          ids = map(references, function(reference) { return reference.id; });

      var adapter = this.adapterForType(type);

      Ember.assert("You tried to load many records but you have no adapter (for " + type + ")", adapter);
      Ember.assert("You tried to load many records but your adapter does not implement `findMany`", adapter.findMany);

      adapter.findMany(this, type, ids, owner);
    }, this);
  },

  referenceForId: function(type, id) {
    var clientId = this.clientIdForId(type, id);
    return this.referenceForClientId(clientId);
  },

  referenceForClientId: function(clientId) {
    var references = this.recordReferences;

    if (references[clientId]) {
      return references[clientId];
    }

    var type = this.clientIdToType[clientId];

    return references[clientId] = {
      id: this.idForClientId(clientId),
      clientId: clientId,
      type: type
    };
  },

  isReferenceMaterialized: function(reference) {
    return !!this.recordCache[reference.clientId];
  },

  recordForReference: function(reference) {
    return this.findByClientId(reference.type, reference.clientId);
  },

  /**
    @private

    `findMany` is the entry point that relationships use to generate a
    new `ManyArray` for the list of IDs specified by the server for
    the relationship.

    Its responsibilities are:

    * convert the IDs into clientIds
    * determine which of the clientIds still need to be loaded
    * create a new ManyArray whose content is *all* of the clientIds
    * notify the ManyArray of the number of its elements that are
      already loaded
    * insert the unloaded clientIds into the `loadingRecordArrays`
      bookkeeping structure, which will allow the `ManyArray` to know
      when all of its loading elements are loaded from the server.
    * ask the adapter to load the unloaded elements, by invoking
      findMany with the still-unloaded IDs.
  */
  findMany: function(type, idsOrReferencesOrOpaque, record, relationship) {
    // 1. Determine which of the client ids need to be loaded
    // 2. Create a new ManyArray whose content is ALL of the clientIds
    // 3. Decrement the ManyArray's counter by the number of loaded clientIds
    // 4. Put the ManyArray into our bookkeeping data structure, keyed on
    //    the needed clientIds
    // 5. Ask the adapter to load the records for the unloaded clientIds (but
    //    convert them back to ids)

    if (!Ember.isArray(idsOrReferencesOrOpaque)) {
      var adapter = this.adapterForType(type);

      if (adapter && adapter.findHasMany) {
        adapter.findHasMany(this, record, relationship, idsOrReferencesOrOpaque);
      } else if (idsOrReferencesOrOpaque !== undefined) {
        Ember.assert("You tried to load many records but you have no adapter (for " + type + ")", adapter);
        Ember.assert("You tried to load many records but your adapter does not implement `findHasMany`", adapter.findHasMany);
      }

      return this.createManyArray(type, Ember.A());
    }

    // Coerce server IDs into Record Reference
    var references = map(idsOrReferencesOrOpaque, function(reference) {
      if (typeof reference !== 'object' && reference !== null) {
        return this.referenceForId(type, reference);
      }

      return reference;
    }, this);

    var neededReferences = this.neededReferences(references),
        manyArray = this.createManyArray(type, Ember.A(references)),
        loadingRecordArrays = this.loadingRecordArrays,
        reference, clientId, i, l;

    // Start the decrementing counter on the ManyArray at the number of
    // records we need to load from the adapter
    manyArray.loadingRecordsCount(neededReferences.length);

    if (neededReferences.length) {
      for (i=0, l=neededReferences.length; i<l; i++) {
        reference = neededReferences[i];
        clientId = reference.clientId;

        // keep track of the record arrays that a given loading record
        // is part of. This way, if the same record is in multiple
        // ManyArrays, all of their loading records counters will be
        // decremented when the adapter provides the data.
        if (loadingRecordArrays[clientId]) {
          loadingRecordArrays[clientId].push(manyArray);
        } else {
          this.loadingRecordArrays[clientId] = [ manyArray ];
        }
      }

      this.fetchMany(neededReferences, record);
    } else {
      // all requested records are available
      manyArray.set('isLoaded', true);

      Ember.run.once(function() {
        manyArray.trigger('didLoad');
      });
    }

    return manyArray;
  },

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    @private
    @method findQuery
    @param {Class} type
    @param {Object} query an opaque query to be used by the adapter
    @return {DS.AdapterPopulatedRecordArray}
  */
  findQuery: function(type, query) {
    var array = DS.AdapterPopulatedRecordArray.create({ type: type, query: query, content: Ember.A([]), store: this });
    var adapter = this.adapterForType(type);

    Ember.assert("You tried to load a query but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to load a query but your adapter does not implement `findQuery`", adapter.findQuery);

    adapter.findQuery(this, type, query, array);

    return array;
  },

  /**
    @private

    This method returns an array of all records adapter can find.
    It triggers the adapter's `findAll` method to give it an opportunity to populate
    the array with records of that type.

    @param {Class} type
    @return {DS.AdapterPopulatedRecordArray}
  */
  findAll: function(type) {
    return this.fetchAll(type, this.all(type));
  },

  /**
    @private
  */
  fetchAll: function(type, array) {
    var adapter = this.adapterForType(type),
        sinceToken = this.typeMapFor(type).metadata.since;

    set(array, 'isUpdating', true);

    Ember.assert("You tried to load all records but you have no adapter (for " + type + ")", adapter);
    Ember.assert("You tried to load all records but your adapter does not implement `findAll`", adapter.findAll);

    adapter.findAll(this, type, sinceToken);

    return array;
  },

  /**
  */
  metaForType: function(type, property, data) {
    var target = this.typeMapFor(type).metadata;
    set(target, property, data);
  },

  /**
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
    var typeMap = this.typeMapFor(type),
        findAllCache = typeMap.findAllCache;

    if (findAllCache) { return findAllCache; }

    var array = DS.RecordArray.create({ type: type, content: Ember.A([]), store: this, isLoaded: true });
    this.registerRecordArray(array, type);

    typeMap.findAllCache = array;
    return array;
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

    Note that the existence of a filter on a type will trigger immediate
    materialization of all loaded data for a given type, so you might
    not want to use filters for a type if you are loading many records
    into the store, many of which are not active at any given time.

    In this scenario, you might want to consider filtering the raw
    data before loading it into the store.

    @method filter
    @param {Class} type
    @param {Function} filter
    @return {DS.FilteredRecordArray}
  */
  filter: function(type, query, filter) {
    // allow an optional server query
    if (arguments.length === 3) {
      this.findQuery(type, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    var array = DS.FilteredRecordArray.create({ type: type, content: Ember.A([]), store: this, filterFunction: filter });

    this.registerRecordArray(array, type, filter);

    return array;
  },

  /**
    This method returns if a certain record is already loaded
    in the store. Use this function to know beforehand if a find()
    will result in a request or that it will be a cache hit.

    @param {Class} type
    @param {string} id
    @return {boolean}
  */
  recordIsLoaded: function(type, id) {
    return !Ember.isNone(this.typeMapFor(type).idToCid[id]);
  },

  // ............
  // . UPDATING .
  // ............

  /**
    @private

    If the adapter updates attributes or acknowledges creation
    or deletion, the record will notify the store to update its
    membership in any filters.

    To avoid thrashing, this method is invoked only once per
    run loop per record.

    @param {Class} type
    @param {Number|String} clientId
    @param {DS.Model} record
  */
  dataWasUpdated: function(type, reference, record) {
    // Because data updates are invoked at the end of the run loop,
    // it is possible that a record might be deleted after its data
    // has been modified and this method was scheduled to be called.
    //
    // If that's the case, the record would have already been removed
    // from all record arrays; calling updateRecordArrays would just
    // add it back. If the record is deleted, just bail. It shouldn't
    // give us any more trouble after this.

    if (get(record, 'isDeleted')) { return; }

    var cidToData = this.clientIdToData,
        clientId = reference.clientId,
        data = cidToData[clientId];

    if (typeof data === "object") {
      this.updateRecordArrays(type, clientId);
    }
  },

  // .................
  // . BASIC ADAPTER .
  // .................

  scheduleSave: function(record) {
    this._recordsToSave.add(record);
    Ember.run.once(this, 'flushSavedRecords');
  },

  flushSavedRecords: function() {
    var created = Ember.OrderedSet.create();
    var updated = Ember.OrderedSet.create();
    var deleted = Ember.OrderedSet.create();

    this._recordsToSave.forEach(function(record) {
      if (get(record, 'isNew')) {
        created.add(record);
      } else if (get(record, 'isDeleted')) {
        deleted.add(record);
      } else {
        updated.add(record);
      }
    });

    this._recordsToSave.clear();

    get(this, '_adapter').commit(this, {
      created: created,
      updated: updated,
      deleted: deleted
    });
  },

  // ..............
  // . PERSISTING .
  // ..............

  /**
    This method delegates committing to the store's implicit
    transaction.

    Calling this method is essentially a request to persist
    any changes to records that were not explicitly added to
    a transaction.
  */
  commit: function() {
    get(this, 'defaultTransaction').commit();
  },

  /**
    Adapters should call this method if they would like to acknowledge
    that all changes related to a record (other than relationship
    changes) have persisted.

    Because relationship changes affect multiple records, the adapter
    is responsible for acknowledging the change to the relationship
    directly (using `store.didUpdateRelationship`) when all aspects
    of the relationship change have persisted.

    It can be called for created, deleted or updated records.

    If the adapter supplies new data, that data will become the new
    canonical data for the record. That will result in blowing away
    all local changes and rematerializing the record with the new
    data (the "sledgehammer" approach).

    Alternatively, if the adapter does not supply new data, the record
    will collapse all local changes into its saved data. Subsequent
    rollbacks of the record will roll back to this point.

    If an adapter is acknowledging receipt of a newly created record
    that did not generate an id in the client, it *must* either
    provide data or explicitly invoke `store.didReceiveId` with
    the server-provided id.

    Note that an adapter may not supply new data when acknowledging
    a deleted record.

    @see DS.Store#didUpdateRelationship

    @param {DS.Model} record the in-flight record
    @param {Object} data optional data (see above)
  */
  didSaveRecord: function(record, data) {
    record.adapterDidCommit();

    if (data) {
      this.updateId(record, data);
      this.updateRecordData(record, data);
    } else {
      this.didUpdateAttributes(record);
    }
  },

  /**
    For convenience, if an adapter is performing a bulk commit, it can also
    acknowledge all of the records at once.

    If the adapter supplies an array of data, they must be in the same order as
    the array of records passed in as the first parameter.

    @param {#forEach} list a list of records whose changes the
      adapter is acknowledging. You can pass any object that
      has an ES5-like `forEach` method, including the
      `OrderedSet` objects passed into the adapter at commit
      time.
    @param {Array[Object]} dataList an Array of data. This
      parameter must be an integer-indexed Array-like.
  */
  didSaveRecords: function(list, dataList) {
    var i = 0;
    list.forEach(function(record) {
      this.didSaveRecord(record, dataList && dataList[i++]);
    }, this);
  },

  /**
    This method allows the adapter to specify that a record
    could not be saved because it had backend-supplied validation
    errors.

    The errors object must have keys that correspond to the
    attribute names. Once each of the specified attributes have
    changed, the record will automatically move out of the
    invalid state and be ready to commit again.

    TODO: We should probably automate the process of converting
    server names to attribute names using the existing serializer
    infrastructure.

    @param {DS.Model} record
    @param {Object} errors
  */
  recordWasInvalid: function(record, errors) {
    record.adapterDidInvalidate(errors);
  },

  /**
     This method allows the adapter to specify that a record
     could not be saved because the server returned an unhandled
     error.

     @param {DS.Model} record
  */
  recordWasError: function(record) {
    record.adapterDidError();
  },

  /**
    This is a lower-level API than `didSaveRecord` that allows an
    adapter to acknowledge the persistence of a single attribute.

    This is useful if an adapter needs to make multiple asynchronous
    calls to fully persist a record. The record will keep track of
    which attributes and relationships are still outstanding and
    automatically move into the `saved` state once the adapter has
    acknowledged everything.

    If a value is provided, it clobbers the locally specified value.
    Otherwise, the local value becomes the record's last known
    saved value (which is used when rolling back a record).

    Note that the specified attributeName is the normalized name
    specified in the definition of the `DS.Model`, not a key in
    the server-provided data.

    Also note that the adapter is responsible for performing any
    transformations on the value using the serializer API.

    @param {DS.Model} record
    @param {String} attributeName
    @param {Object} value
  */
  didUpdateAttribute: function(record, attributeName, value) {
    record.adapterDidUpdateAttribute(attributeName, value);
  },

  /**
    This method allows an adapter to acknowledge persistence
    of all attributes of a record but not relationships or
    other factors.

    It loops through the record's defined attributes and
    notifies the record that they are all acknowledged.

    This method does not take optional values, because
    the adapter is unlikely to have a hash of normalized
    keys and transformed values, and instead of building
    one up, it should just call `didUpdateAttribute` as
    needed.

    This method is intended as a middle-ground between
    `didSaveRecord`, which acknowledges all changes to
    a record, and `didUpdateAttribute`, which allows an
    adapter fine-grained control over updates.

    @param {DS.Model} record
  */
  didUpdateAttributes: function(record) {
    record.eachAttribute(function(attributeName) {
      this.didUpdateAttribute(record, attributeName);
    }, this);
  },

  /**
    This allows an adapter to acknowledge that it has saved all
    necessary aspects of a relationship change.

    This is separated from acknowledging the record itself
    (via `didSaveRecord`) because a relationship change can
    involve as many as three separate records. Records should
    only move out of the in-flight state once the server has
    acknowledged all of their relationships, and this differs
    based upon the adapter's semantics.

    There are three basic scenarios by which an adapter can
    save a relationship.

    ### Foreign Key

    An adapter can save all relationship changes by updating
    a foreign key on the child record. If it does this, it
    should acknowledge the changes when the child record is
    saved.

        record.eachRelationship(function(name, meta) {
          if (meta.kind === 'belongsTo') {
            store.didUpdateRelationship(record, name);
          }
        });

        store.didSaveRecord(record, data);

    ### Embedded in Parent

    An adapter can save one-to-many relationships by embedding
    IDs (or records) in the parent object. In this case, the
    relationship is not considered acknowledged until both the
    old parent and new parent have acknowledged the change.

    In this case, the adapter should keep track of the old
    parent and new parent, and acknowledge the relationship
    change once both have acknowledged. If one of the two
    sides does not exist (e.g. the new parent does not exist
    because of nulling out the belongs-to relationship),
    the adapter should acknowledge the relationship once
    the other side has acknowledged.

    ### Separate Entity

    An adapter can save relationships as separate entities
    on the server. In this case, they should acknowledge
    the relationship as saved once the server has
    acknowledged the entity.

    @see DS.Store#didSaveRecord

    @param {DS.Model} record
    @param {DS.Model} relationshipName
  */
  didUpdateRelationship: function(record, relationshipName) {
    var relationship = this.relationshipChangeFor(get(record, 'clientId'), relationshipName);
    //TODO(Igor)
    if (relationship) { relationship.adapterDidUpdate(); }
  },

  /**
    This allows an adapter to acknowledge all relationship changes
    for a given record.

    Like `didUpdateAttributes`, this is intended as a middle ground
    between `didSaveRecord` and fine-grained control via the
    `didUpdateRelationship` API.
  */
  didUpdateRelationships: function(record) {
    var changes = this.relationshipChangesFor(get(record, '_reference'));

    for (var name in changes) {
      if (!changes.hasOwnProperty(name)) { continue; }
      changes[name].adapterDidUpdate();
    }
  },

  /**
    When acknowledging the creation of a locally created record,
    adapters must supply an id (if they did not implement
    `generateIdForRecord` to generate an id locally).

    If an adapter does not use `didSaveRecord` and supply a hash
    (for example, if it needs to make multiple HTTP requests to
    create and then update the record), it will need to invoke
    `didReceiveId` with the backend-supplied id.

    When not using `didSaveRecord`, an adapter will need to
    invoke:

    * didReceiveId (unless the id was generated locally)
    * didCreateRecord
    * didUpdateAttribute(s)
    * didUpdateRelationship(s)

    @param {DS.Model} record
    @param {Number|String} id
  */
  didReceiveId: function(record, id) {
    var typeMap = this.typeMapFor(record.constructor),
        clientId = get(record, 'clientId'),
        oldId = get(record, 'id');

    Ember.assert("An adapter cannot assign a new id to a record that already has an id. " + record + " had id: " + oldId + " and you tried to update it with " + id + ". This likely happened because your server returned data in response to a find or update that had a different id than the one you sent.", oldId === undefined || id === oldId);

    typeMap.idToCid[id] = clientId;
    this.clientIdToId[clientId] = id;
  },

  /**
    @private

    This method re-indexes the data by its clientId in the store
    and then notifies the record that it should rematerialize
    itself.

    @param {DS.Model} record
    @param {Object} data
  */
  updateRecordData: function(record, data) {
    var clientId = get(record, 'clientId'),
        cidToData = this.clientIdToData;

    cidToData[clientId] = data;

    record.didChangeData();
  },

  /**
    @private

    If an adapter invokes `didSaveRecord` with data, this method
    extracts the id from the supplied data (using the adapter's
    `extractId()` method) and indexes the clientId with that id.

    @param {DS.Model} record
    @param {Object} data
  */
  updateId: function(record, data) {
    var typeMap = this.typeMapFor(record.constructor),
        clientId = get(record, 'clientId'),
        oldId = get(record, 'id'),
        type = record.constructor,
        id = this.preprocessData(type, data);

    Ember.assert("An adapter cannot assign a new id to a record that already has an id. " + record + " had id: " + oldId + " and you tried to update it with " + id + ". This likely happened because your server returned data in response to a find or update that had a different id than the one you sent.", oldId === null || id === oldId);

    typeMap.idToCid[id] = clientId;
    this.clientIdToId[clientId] = id;
    this.referenceForClientId(clientId).id = id;
  },

  /**
    @private

    This method receives opaque data provided by the adapter and
    preprocesses it, returning an ID.

    The actual preprocessing takes place in the adapter. If you would
    like to change the default behavior, you should override the
    appropriate hooks in `DS.Serializer`.

    @see {DS.Serializer}
    @return {String} id the id represented by the data
  */
  preprocessData: function(type, data) {
    return this.adapterForType(type).extractId(type, data);
  },

  // .................
  // . RECORD ARRAYS .
  // .................

  /**
    @private

    Register a RecordArray for a given type to be backed by
    a filter function. This will cause the array to update
    automatically when records of that type change attribute
    values or states.

    @param {DS.RecordArray} array
    @param {Class} type
    @param {Function} filter
  */
  registerRecordArray: function(array, type, filter) {
    var recordArrays = this.typeMapFor(type).recordArrays;

    recordArrays.push(array);

    this.updateRecordArrayFilter(array, type, filter);
  },

  /**
    @private

    Create a `DS.ManyArray` for a type and list of clientIds
    and index the `ManyArray` under each clientId. This allows
    us to efficiently remove records from `ManyArray`s when
    they are deleted.

    @param {Class} type
    @param {Array} clientIds

    @return {DS.ManyArray}
  */
  createManyArray: function(type, clientIds) {
    var array = DS.ManyArray.create({ type: type, content: clientIds, store: this });

    clientIds.forEach(function(clientId) {
      var recordArrays = this.recordArraysForClientId(clientId);
      recordArrays.add(array);
    }, this);

    return array;
  },

  /**
    @private

    This method is invoked if the `filterFunction` property is
    changed on a `DS.FilteredRecordArray`.

    It essentially re-runs the filter from scratch. This same
    method is invoked when the filter is created in th first place.
  */
  updateRecordArrayFilter: function(array, type, filter) {
    var typeMap = this.typeMapFor(type),
        cidToData = this.clientIdToData,
        clientIds = typeMap.clientIds,
        clientId, data, shouldFilter, record;

    for (var i=0, l=clientIds.length; i<l; i++) {
      clientId = clientIds[i];
      shouldFilter = false;

      data = cidToData[clientId];

      if (typeof data === 'object') {
        if (record = this.recordCache[clientId]) {
          if (!get(record, 'isDeleted')) { shouldFilter = true; }
        } else {
          shouldFilter = true;
        }

        if (shouldFilter) {
          this.updateRecordArray(array, filter, type, clientId);
        }
      }
    }
  },

  updateRecordArraysLater: function(type, clientId) {
    Ember.run.once(this, function() {
      this.updateRecordArrays(type, clientId);
    });
  },

  /**
    @private

    This method is invoked whenever data is loaded into the store
    by the adapter or updated by the adapter, or when an attribute
    changes on a record.

    It updates all filters that a record belongs to.

    To avoid thrashing, it only runs once per run loop per record.

    @param {Class} type
    @param {Number|String} clientId
  */
  updateRecordArrays: function(type, clientId) {
    var recordArrays = this.typeMapFor(type).recordArrays,
        filter;

    recordArrays.forEach(function(array) {
      filter = get(array, 'filterFunction');
      this.updateRecordArray(array, filter, type, clientId);
    }, this);

    // loop through all manyArrays containing an unloaded copy of this
    // clientId and notify them that the record was loaded.
    var manyArrays = this.loadingRecordArrays[clientId];

    if (manyArrays) {
      for (var i=0, l=manyArrays.length; i<l; i++) {
        manyArrays[i].loadedRecord();
      }

      this.loadingRecordArrays[clientId] = null;
    }
  },

  /**
    @private

    Update an individual filter.

    @param {DS.FilteredRecordArray} array
    @param {Function} filter
    @param {Class} type
    @param {Number|String} clientId
  */
  updateRecordArray: function(array, filter, type, clientId) {
    var shouldBeInArray, record;

    if (!filter) {
      shouldBeInArray = true;
    } else {
      record = this.findByClientId(type, clientId);
      shouldBeInArray = filter(record);
    }

    var recordArrays = this.recordArraysForClientId(clientId);
    var reference = this.referenceForClientId(clientId);

    if (shouldBeInArray) {
      recordArrays.add(array);
      array.addReference(reference);
    } else if (!shouldBeInArray) {
      recordArrays.remove(array);
      array.removeReference(reference);
    }
  },

  /**
    @private

    When a record is deleted, it is removed from all its
    record arrays.

    @param {DS.Model} record
  */
  removeFromRecordArrays: function(record) {
    var reference = get(record, '_reference');
    var recordArrays = this.recordArraysForClientId(reference.clientId);

    recordArrays.forEach(function(array) {
      array.removeReference(reference);
    });
  },

  // ............
  // . INDEXING .
  // ............

  /**
    @private

    Return a list of all `DS.RecordArray`s a clientId is
    part of.

    @return {Object(clientId: Ember.OrderedSet)}
  */
  recordArraysForClientId: function(clientId) {
    var recordArrays = get(this, 'recordArraysByClientId');
    var ret = recordArrays[clientId];

    if (!ret) {
      ret = recordArrays[clientId] = Ember.OrderedSet.create();
    }

    return ret;
  },

  typeMapFor: function(type) {
    var typeMaps = get(this, 'typeMaps');
    var guidForType = Ember.guidFor(type);

    var typeMap = typeMaps[guidForType];

    if (typeMap) {
      return typeMap;
    } else {
      return (typeMaps[guidForType] =
        {
          idToCid: {},
          clientIds: [],
          recordArrays: [],
          metadata: {}
      });
    }
  },

  /** @private

    For a given type and id combination, returns the client id used by the store.
    If no client id has been assigned yet, one will be created and returned.

    @param {DS.Model} type
    @param {String|Number} id
  */
  clientIdForId: function(type, id) {
    id = coerceId(id);

    var clientId = this.typeMapFor(type).idToCid[id];
    if (clientId !== undefined) { return clientId; }

    return this.pushData(UNLOADED, id, type);
  },

  /**
    @private

    This method works exactly like `clientIdForId`, but does not
    require looking up the `typeMap` for every `clientId` and
    invoking a method per `clientId`.
  */
  clientIdsForIds: function(type, ids) {
    var typeMap = this.typeMapFor(type),
        idToClientIdMap = typeMap.idToCid;

    return map(ids, function(id) {
      id = coerceId(id);

      var clientId = idToClientIdMap[id];
      if (clientId) { return clientId; }
      return this.pushData(UNLOADED, id, type);
    }, this);
  },

  typeForClientId: function(clientId) {
    return this.clientIdToType[clientId];
  },

  idForClientId: function(clientId) {
    return this.clientIdToId[clientId];
  },

  // ................
  // . LOADING DATA .
  // ................

  /**
    Load new data into the store for a given id and type combination.
    If data for that record had been loaded previously, the new information
    overwrites the old.

    If the record you are loading data for has outstanding changes that have not
    yet been saved, an exception will be thrown.

    @param {DS.Model} type
    @param {String|Number} id
    @param {Object} data the data to load
  */
  load: function(type, data, prematerialized) {
    var id;

    if (typeof data === 'number' || typeof data === 'string') {
      id = data;
      data = prematerialized;
      prematerialized = null;
    }

    if (prematerialized && prematerialized.id) {
      id = prematerialized.id;
    } else if (id === undefined) {
      id = this.preprocessData(type, data);
    }

    id = coerceId(id);

    var typeMap = this.typeMapFor(type),
        clientId = typeMap.idToCid[id],
        cidToPrematerialized = this.clientIdToPrematerializedData;

    if (clientId !== undefined) {
      this.loadData(data, clientId, type);
      cidToPrematerialized[clientId] = prematerialized;

      var record = this.recordCache[clientId];
      if (record) {
        once(record, 'loadedData');
      }
    } else {
      clientId = this.pushData(data, id, type);
      cidToPrematerialized[clientId] = prematerialized;
    }

    this.updateRecordArraysLater(type, clientId);

    return this.referenceForClientId(clientId);
  },

  prematerialize: function(reference, prematerialized) {
    this.clientIdToPrematerializedData[reference.clientId] = prematerialized;
  },

  loadMany: function(type, ids, dataList) {
    if (dataList === undefined) {
      dataList = ids;
      ids = map(dataList, function(data) {
        return this.preprocessData(type, data);
      }, this);
    }

    return map(ids, function(id, i) {
      return this.load(type, id, dataList[i]);
    }, this);
  },

  loadHasMany: function(record, key, ids) {
    //It looks sad to have to do the conversion in the store
    var type = record.get(key + '.type'),
        tuples = map(ids, function(id) {
          return {id: id, type: type};
        });
    record.materializeHasMany(key, tuples);

    // Update any existing many arrays that use the previous IDs,
    // if necessary.
    record.hasManyDidChange(key);

    var relationship = record.cacheFor(key);

    // TODO (tomdale) this assumes that loadHasMany *always* means
    // that the records for the provided IDs are loaded.
    if (relationship) {
      set(relationship, 'isLoaded', true);
      relationship.trigger('didLoad');
    }
  },

  loadData: function(data, clientId, type){
    var cidToData = this.clientIdToData;

    cidToData[clientId] = data;
  },

  /** @private

    Stores data for the specified type and id combination and returns
    the client id.

    @param {Object} data
    @param {String|Number} id
    @param {DS.Model} type
    @returns {Number}
  */
  pushData: function(data, id, type) {
    var typeMap = this.typeMapFor(type);

    var idToClientIdMap = typeMap.idToCid,
        clientIdToIdMap = this.clientIdToId,
        clientIdToTypeMap = this.clientIdToType,
        clientIds = typeMap.clientIds,
        cidToData = this.clientIdToData,
        clientId;

    // If we load an item referenced in a relationship,
    // it already has a clientId, but still needs to be materialized.
    if(clientId=idToClientIdMap[id]) {
      Ember.assert('The id ' + id + ' has already been used with another record of type ' + type.toString() + '.', !(data === CREATED && !!cidToData[clientId]));
    } else {
      clientId = ++this.clientIdCounter;
      clientIds.push(clientId);
    }

    this.loadData(data, clientId, type);
    clientIdToTypeMap[clientId] = type;

    // if we're creating an item, this process will be done
    // later, once the object has been persisted.
    if (id) {
      idToClientIdMap[id] = clientId;
      clientIdToIdMap[clientId] = id;
    }

    return clientId;
  },

  // ..........................
  // . RECORD MATERIALIZATION .
  // ..........................

  materializeRecord: function(type, clientId, id) {
    var record;

    this.recordCache[clientId] = record = type._create({
      store: this,
      clientId: clientId
    });

    set(record, 'id', id);

    get(this, 'defaultTransaction').adoptRecord(record);

    record.loadingData();
    return record;
  },

  dematerializeRecord: function(record) {
    var id = get(record, 'id'),
        clientId = get(record, 'clientId'),
        type = this.typeForClientId(clientId),
        typeMap = this.typeMapFor(type);

    record.updateRecordArrays();

    delete this.recordCache[clientId];
    delete this.clientIdToId[clientId];
    delete this.clientIdToType[clientId];
    delete this.clientIdToData[clientId];
    delete this.recordArraysByClientId[clientId];

    if (id) { delete typeMap.idToCid[id]; }
  },

  willDestroy: function() {
    if (get(DS, 'defaultStore') === this) {
      set(DS, 'defaultStore', null);
    }
  },

  // ........................
  // . RELATIONSHIP CHANGES .
  // ........................

  addRelationshipChangeFor: function(clientReference, childKey, parentReference, parentKey, change) {
    var clientId = clientReference.clientId,
        parentClientId = parentReference ? parentReference.clientId : parentReference;
    var key = childKey + parentKey;
    var changes = this.relationshipChanges;
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

  removeRelationshipChangeFor: function(clientReference, childKey, parentReference, parentKey, type) {
    var clientId = clientReference.clientId,
        parentClientId = parentReference ? parentReference.clientId : parentReference;
    var changes = this.relationshipChanges;
    var key = childKey + parentKey;
    if (!(clientId in changes) || !(parentClientId in changes[clientId]) || !(key in changes[clientId][parentClientId])){
      return;
    }
    delete changes[clientId][parentClientId][key][type];
  },

  relationshipChangeFor: function(clientId, childKey, parentClientId, parentKey, type) {
    var changes = this.relationshipChanges;
    var key = childKey + parentKey;
    if (!(clientId in changes) || !(parentClientId in changes[clientId])){
      return;
    }
    if(type){
      return changes[clientId][parentClientId][key][type];
    }
    else{
      //TODO(Igor) what if both present
      return changes[clientId][parentClientId][key]["add"] || changes[clientId][parentClientId][key]["remove"];
    }
  },

  relationshipChangePairsFor: function(reference){
    var toReturn = [];

    if( !reference ) { return toReturn; }

    //TODO(Igor) What about the other side
    var changesObject = this.relationshipChanges[reference.clientId];
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

  relationshipChangesFor: function(reference) {
    var toReturn = [];

    if( !reference ) { return toReturn; }

    var relationshipPairs = this.relationshipChangePairsFor(reference);
    forEach(relationshipPairs, function(pair){
      var addedChange = pair["add"];
      var removedChange = pair["remove"];
      if(addedChange){
        toReturn.push(addedChange);
      }
      if(removedChange){
        toReturn.push(removedChange);
      }
    });
    return toReturn;
  },
  // ......................
  // . PER-TYPE ADAPTERS
  // ......................

  adapterForType: function(type) {
    this._adaptersMap = this.createInstanceMapFor('adapters');

    var adapter = this._adaptersMap.get(type);
    if (adapter) { return adapter; }

    return this.get('_adapter');
  },

  // ..............................
  // . RECORD CHANGE NOTIFICATION .
  // ..............................

  recordAttributeDidChange: function(reference, attributeName, newValue, oldValue) {
    var record = this.recordForReference(reference),
        dirtySet = new Ember.OrderedSet(),
        adapter = this.adapterForType(record.constructor);

    if (adapter.dirtyRecordsForAttributeChange) {
      adapter.dirtyRecordsForAttributeChange(dirtySet, record, attributeName, newValue, oldValue);
    }

    dirtySet.forEach(function(record) {
      record.adapterDidDirty();
    });
  },

  recordBelongsToDidChange: function(dirtySet, child, relationship) {
    var adapter = this.adapterForType(child.constructor);

    if (adapter.dirtyRecordsForBelongsToChange) {
      adapter.dirtyRecordsForBelongsToChange(dirtySet, child, relationship);
    }

    // adapterDidDirty is called by the RelationshipChange that created
    // the dirtySet.
  },

  recordHasManyDidChange: function(dirtySet, parent, relationship) {
    var adapter = this.adapterForType(parent.constructor);

    if (adapter.dirtyRecordsForHasManyChange) {
      adapter.dirtyRecordsForHasManyChange(dirtySet, parent, relationship);
    }

    // adapterDidDirty is called by the RelationshipChange that created
    // the dirtySet.
  }
});

DS.Store.reopenClass({
  registerAdapter: DS._Mappable.generateMapFunctionFor('adapters', function(type, adapter, map) {
    map.set(type, adapter);
  }),

  transformMapKey: function(key) {
    if (typeof key === 'string') {
      var transformedKey;
      transformedKey = get(Ember.lookup, key);
      Ember.assert("Could not find model at path " + key, transformedKey);
      return transformedKey;
    } else {
      return key;
    }
  },

  transformMapValue: function(key, value) {
    if (Ember.Object.detect(value)) {
      return value.create();
    }

    return value;
  }
});
