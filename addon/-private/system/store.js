/**
  @module ember-data
*/

import Ember from 'ember';
import Model from 'ember-data/model';
import { instrument, assert, deprecate, warn, runInDebug } from "ember-data/-private/debug";
import normalizeModelName from "ember-data/-private/system/normalize-model-name";
import { InvalidError } from 'ember-data/adapters/errors';

import {
  promiseArray,
  promiseObject
} from "ember-data/-private/system/promise-proxies";

import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/-private/system/store/common";

import { normalizeResponseHelper } from "ember-data/-private/system/store/serializer-response";
import { serializerForAdapter } from "ember-data/-private/system/store/serializers";

import {
  _find,
  _findMany,
  _findHasMany,
  _findBelongsTo,
  _findAll,
  _query,
  _queryRecord
} from "ember-data/-private/system/store/finders";

import { getOwner } from 'ember-data/-private/utils';
import coerceId from "ember-data/-private/system/coerce-id";
import RecordArrayManager from "ember-data/-private/system/record-array-manager";
import ContainerInstanceCache from 'ember-data/-private/system/store/container-instance-cache';
import InternalModel from "ember-data/-private/system/model/internal-model";
import EmptyObject from "ember-data/-private/system/empty-object";
import isEnabled from 'ember-data/-private/features';

export let badIdFormatAssertion = '`id` passed to `findRecord()` has to be non-empty string or number';

const {
  A,
  _Backburner: Backburner,
  computed,
  copy,
  ENV,
  Error: EmberError,
  get,
  guidFor,
  inspect,
  isNone,
  isPresent,
  MapWithDefault,
  run: emberRun,
  set,
  RSVP,
  Service,
  typeOf
} = Ember;


const { Promise } = RSVP;

//Get the materialized model from the internalModel/promise that returns
//an internal model and return it in a promiseObject. Useful for returning
//from find methods
function promiseRecord(internalModelPromise, label) {
  let toReturn = internalModelPromise.then((internalModel) => internalModel.getRecord());

  return promiseObject(toReturn, label);
}


let Store;

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

const {
  _generateId,
  _internalModelForId,
  _load,
  _modelForMixin,
  _pushInternalModel,
  _setupRelationships,
  adapterFor,
  buildInternalModel,
  didUpdateAll,
  modelFactoryFor,
  modelFor,
  normalize,
  peekAll,
  peekRecord,
  serializerFor,
  typeMapFor,
  typeMapFor_allocate
} = heimdall.registerMonitor('store',
  '_generateId',
  '_internalModelForId',
  '_load',
  '_modelForMixin',
  '_pushInternalModel',
  '_setupRelationships',
  'adapterFor',
  'buildInternalModel',
  'didUpdateAll',
  'modelFactoryFor',
  'modelFor',
  'normalize',
  'peekAll',
  'peekRecord',
  'serializerFor',
  'typeMapFor',
  'typeMapFor_allocate'
);

/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of `DS.Model` that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Define your application's store like this:

  ```app/services/store.js
  import DS from 'ember-data';

  export default DS.Store.extend({
  });
  ```

  Most Ember.js applications will only have a single `DS.Store` that is
  automatically created by their `Ember.Application`.

  You can retrieve models from the store in several ways. To retrieve a record
  for a specific id, use `DS.Store`'s `findRecord()` method:

  ```javascript
  store.findRecord('person', 123).then(function (person) {
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
  init() {
    this._super(...arguments);
    this._backburner = new Backburner(['normalizeRelationships', 'syncRelationships', 'finished']);
    // internal bookkeeping; not observable
    this.typeMaps = {};
    this.recordArrayManager = RecordArrayManager.create({
      store: this
    });
    this._pendingSave = [];
    this._instanceCache = new ContainerInstanceCache(getOwner(this), this);

    //Used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = MapWithDefault.create({ defaultValue() { return []; } });
  },

  /**
    The default adapter to use to communicate to a backend server or
    other persistence layer. This will be overridden by an application
    adapter if present.

    If you want to specify `app/adapters/custom.js` as a string, do:

    ```js
    import DS from 'ember-data';

    export default DS.Store.extend({
      adapter: 'custom',
    });
    ```

    @property adapter
    @default '-json-api'
    @type {String}
  */
  adapter: '-json-api',

  /**
    Returns a JSON representation of the record using a custom
    type-specific serializer, if one exists.

    The available options are:

    * `includeId`: `true` if the record's ID should be included in
      the JSON representation

    @method serialize
    @private
    @deprecated
    @param {DS.Model} record the record to serialize
    @param {Object} options an options hash
  */
  serialize(record, options) {
    if (isEnabled('ds-deprecate-store-serialize')) {
      deprecate('Use of store.serialize is deprecated, use record.serialize instead.', false, {
        id: 'ds.store.serialize',
        until: '3.0'
      });
    }
    let snapshot = record._internalModel.createSnapshot();
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
  defaultAdapter: computed('adapter', function() {
    let adapter = get(this, 'adapter');

    assert('You tried to set `adapter` property to an instance of `DS.Adapter`, where it should be a name', typeof adapter === 'string');

    return this.adapterFor(adapter);
  }),

  // .....................
  // . CREATE NEW RECORD .
  // .....................

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    To create a new instance of a `Post`:

    ```js
    store.createRecord('post', {
      title: "Rails is omakase"
    });
    ```

    To create a new instance of a `Post` that has a relationship with a `User` record:

    ```js
    let user = this.store.peekRecord('user', 1);
    store.createRecord('post', {
      title: "Rails is omakase",
      user: user
    });
    ```

    @method createRecord
    @param {String} modelName
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {DS.Model} record
  */
  createRecord(modelName, inputProperties) {
    assert("You need to pass a model name to the store's createRecord method", isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${inspect(modelName)}`, typeof modelName === 'string');
    let modelClass = this.modelFor(modelName);
    let properties = copy(inputProperties) || new EmptyObject();

    // If the passed properties do not include a primary key,
    // give the adapter an opportunity to generate one. Typically,
    // client-side ID generators will use something like uuid.js
    // to avoid conflicts.

    if (isNone(properties.id)) {
      properties.id = this._generateId(modelName, properties);
    }

    // Coerce ID to a string
    properties.id = coerceId(properties.id);

    let internalModel = this.buildInternalModel(modelClass, properties.id);
    let record = internalModel.getRecord();

    // Move the record out of its initial `empty` state into
    // the `loaded` state.
    // TODO @runspired this seems really bad, store should not be changing the state
    internalModel.loadedData();

    // Set the properties specified on the record.
    // TODO @runspired this is probably why we do the bad thing above
    record.setProperties(properties);

    // TODO @runspired this should also be coalesced into some form of internalModel.setState()
    internalModel.eachRelationship((key, descriptor) => {
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
  _generateId(modelName, properties) {
    heimdall.increment(_generateId);
    let adapter = this.adapterFor(modelName);

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
    let post = store.createRecord('post', {
      title: "Rails is omakase"
    });

    store.deleteRecord(post);
    ```

    @method deleteRecord
    @param {DS.Model} record
  */
  deleteRecord(record) {
    record.deleteRecord();
  },

  /**
    For symmetry, a record can be unloaded via the store. Only
    non-dirty records can be unloaded.

    Example

    ```javascript
    store.findRecord('post', 1).then(function(post) {
      store.unloadRecord(post);
    });
    ```

    @method unloadRecord
    @param {DS.Model} record
  */
  unloadRecord(record) {
    record.unloadRecord();
  },

  // ................
  // . FIND RECORDS .
  // ................

  /**
    @method find
    @param {String} modelName
    @param {String|Integer} id
    @param {Object} options
    @return {Promise} promise
    @private
  */
  find(modelName, id, options) {
    // The default `model` hook in Ember.Route calls `find(modelName, id)`,
    // that's why we have to keep this method around even though `findRecord` is
    // the public way to get a record by modelName and id.

    if (arguments.length === 1) {
      assert('Using store.find(type) has been removed. Use store.findAll(type) to retrieve all records for a given type.');
    }

    if (typeOf(id) === 'object') {
      assert('Calling store.find() with a query object is no longer supported. Use store.query() instead.');
    }

    if (options) {
      assert('Calling store.find(type, id, { preload: preload }) is no longer supported. Use store.findRecord(type, id, { preload: preload }) instead.');
    }

    assert("You need to pass the model name and id to the store's find method", arguments.length === 2);
    assert("You cannot pass `" + inspect(id) + "` as id to the store's find method", typeOf(id) === 'string' || typeOf(id) === 'number');
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');

    return this.findRecord(modelName, id);
  },

  /**
    This method returns a record for a given type and id combination.

    The `findRecord` method will always resolve its promise with the same
    object for a given type and `id`.

    The `findRecord` method will always return a **promise** that will be
    resolved with the record.

    Example

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
        return this.store.findRecord('post', params.post_id);
      }
    });
    ```

    If the record is not yet available, the store will ask the adapter's `find`
    method to find the necessary data. If the record is already present in the
    store, it depends on the reload behavior _when_ the returned promise
    resolves.

    ### Reloading

    The reload behavior is configured either via the passed `options` hash or
    the result of the adapter's `shouldReloadRecord`.

    If `{ reload: true }` is passed or `adapter.shouldReloadRecord` evaluates
    to `true`, then the returned promise resolves once the adapter returns
    data, regardless if the requested record is already in the store:

    ```js
    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    // adapter#findRecord resolves with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]
    store.findRecord('post', 1, { reload: true }).then(function(post) {
      post.get("revision"); // 2
    });
    ```

    If no reload is indicated via the abovementioned ways, then the promise
    immediately resolves with the cached version in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadRecord` evaluates to `true`,
    then a background reload is started, which updates the records' data, once
    it is available:

    ```js
    // app/adapters/post.js
    import ApplicationAdapter from "./application";

    export default ApplicationAdapter.extend({
      shouldReloadRecord(store, snapshot) {
        return false;
      },

      shouldBackgroundReloadRecord(store, snapshot) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    let blogPost = store.findRecord('post', 1).then(function(post) {
      post.get('revision'); // 1
    });

    // later, once adapter#findRecord resolved with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]

    blogPost.get('revision'); // 2
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findRecord`.

    ```app/routes/post/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
        return this.store.findRecord('post', params.post_id, { backgroundReload: false });
      }
    });
    ```

   If you pass an object on the `adapterOptions` property of the options
   argument it will be passed to you adapter via the snapshot

    ```app/routes/post/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
        return this.store.findRecord('post', params.post_id, {
          adapterOptions: { subscribe: false }
        });
      }
    });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      findRecord: function(store, type, id, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    });
    ```

    See [peekRecord](#method_peekRecord) to get the cached version of a record.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](http://emberjs.com/api/data/classes/DS.JSONAPIAdapter.html)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findRecord()` to automatically retrieve additional records related to
    the one you request by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve a specific post we can have the server also return that post's
    comments in the same request:

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
       return this.store.findRecord('post', params.post_id, {include: 'comments'});
      }
    });

    ```
    In this case, the post's comments would then be available in your template as
    `model.comments`.

    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the post's
    comments and the authors of those comments the request would look like this:

    ```app/routes/post.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
       return this.store.findRecord('post', params.post_id, {include: 'comments,comments.author'});
      }
    });

    ```

    @since 1.13.0
    @method findRecord
    @param {String} modelName
    @param {(String|Integer)} id
    @param {Object} options
    @return {Promise} promise
  */
  findRecord(modelName, id, options) {
    assert("You need to pass a model name to the store's findRecord method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    assert(badIdFormatAssertion, (typeof id === 'string' && id.length > 0) || (typeof id === 'number' && !isNaN(id)));

    let internalModel = this._internalModelForId(modelName, id);
    options = options || {};

    if (!this.hasRecordForId(modelName, id)) {
      return this._findByInternalModel(internalModel, options);
    }

    let fetchedInternalModel = this._findRecord(internalModel, options);

    return promiseRecord(fetchedInternalModel, "DS: Store#findRecord " + internalModel.typeKey + " with id: " + get(internalModel, 'id'));
  },

  _findRecord(internalModel, options) {
    // Refetch if the reload option is passed
    if (options.reload) {
      return this._scheduleFetch(internalModel, options);
    }

    let snapshot = internalModel.createSnapshot(options);
    let modelClass = internalModel.type;
    let adapter = this.adapterFor(modelClass.modelName);

    // Refetch the record if the adapter thinks the record is stale
    if (adapter.shouldReloadRecord(this, snapshot)) {
      return this._scheduleFetch(internalModel, options);
    }

    if (options.backgroundReload === false) {
      return Promise.resolve(internalModel);
    }

    // Trigger the background refetch if backgroundReload option is passed
    if (options.backgroundReload || adapter.shouldBackgroundReloadRecord(this, snapshot)) {
      this._scheduleFetch(internalModel, options);
    }

    // Return the cached record
    return Promise.resolve(internalModel);
  },

  _findByInternalModel(internalModel, options) {
    options = options || {};

    if (options.preload) {
      internalModel.preloadData(options.preload);
    }

    let fetchedInternalModel = this._findEmptyInternalModel(internalModel, options);

    return promiseRecord(fetchedInternalModel, "DS: Store#findRecord " + internalModel.typeKey + " with id: " + get(internalModel, 'id'));
  },

  _findEmptyInternalModel(internalModel, options) {
    if (internalModel.isEmpty()) {
      return this._scheduleFetch(internalModel, options);
    }

    //TODO double check about reloading
    if (internalModel.isLoading()) {
      return internalModel._loadingPromise;
    }

    return Promise.resolve(internalModel);
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
  findByIds(modelName, ids) {
    assert("You need to pass a model name to the store's findByIds method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    let promises = new Array(ids.length);

    for (let i = 0; i < ids.length; i++) {
      promises[i] = this.findRecord(modelName, ids[i]);
    }

    return promiseArray(RSVP.all(promises).then(A, null, "DS: Store#findByIds of " + modelName + " complete"));
  },

  /**
    This method is called by `findRecord` if it discovers that a particular
    type/id pair hasn't been loaded yet to kick off a request to the
    adapter.

    @method _fetchRecord
    @private
    @param {InternalModel} internalModel model
    @return {Promise} promise
   */
  _fetchRecord(internalModel, options) {
    let modelClass = internalModel.type;
    let id = internalModel.id;
    let adapter = this.adapterFor(modelClass.modelName);

    assert("You tried to find a record but you have no adapter (for " + modelClass.modelName + ")", adapter);
    assert("You tried to find a record but your adapter (for " + modelClass.modelName + ") does not implement 'findRecord'", typeof adapter.findRecord === 'function');

    return _find(adapter, this, modelClass, id, internalModel, options);
  },

  _scheduleFetchMany(internalModels) {
    let fetches = new Array(internalModels.length);

    for (let i = 0; i < internalModels.length; i++) {
      fetches[i] = this._scheduleFetch(internalModels[i]);
    }

    return Promise.all(fetches);
  },

  _scheduleFetch(internalModel, options) {
    if (internalModel._loadingPromise) { return internalModel._loadingPromise; }

    let modelClass = internalModel.type;
    let resolver = RSVP.defer('Fetching ' + modelClass.modelName + ' with id: ' + internalModel.id);
    let pendingFetchItem = {
      internalModel,
      resolver,
      options
    };
    let promise = resolver.promise;

    internalModel.loadingData(promise);
    this._pendingFetch.get(modelClass).push(pendingFetchItem);

    emberRun.scheduleOnce('afterRender', this, this.flushAllPendingFetches);

    return promise;
  },

  flushAllPendingFetches() {
    if (this.isDestroyed || this.isDestroying) {
      return;
    }

    this._pendingFetch.forEach(this._flushPendingFetchForType, this);
    this._pendingFetch.clear();
  },

  _flushPendingFetchForType(pendingFetchItems, modelClass) {
    let store = this;
    let adapter = store.adapterFor(modelClass.modelName);
    let shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    let totalItems = pendingFetchItems.length;
    let internalModels = new Array(totalItems);
    let seeking = new EmptyObject();

    for (let i = 0; i < totalItems; i++) {
      let pendingItem = pendingFetchItems[i];
      let internalModel = pendingItem.internalModel;
      internalModels[i] = internalModel;
      seeking[internalModel.id] = pendingItem;
    }

    function _fetchRecord(recordResolverPair) {
      let recordFetch = store._fetchRecord(
        recordResolverPair.internalModel,
        recordResolverPair.options
      );  // TODO adapter options

      recordResolverPair.resolver.resolve(recordFetch);
    }

    function handleFoundRecords(foundInternalModels, expectedInternalModels) {
      // resolve found records
      let found = new EmptyObject();
      for (let i = 0, l = foundInternalModels.length; i < l; i++) {
        let internalModel = foundInternalModels[i];
        let pair = seeking[internalModel.id];
        found[internalModel.id] = internalModel;

        if (pair) {
          let resolver = pair.resolver;
          resolver.resolve(internalModel);
        }
      }

      // reject missing records
      let missingInternalModels = [];

      for (let i = 0, l = expectedInternalModels.length; i < l; i++) {
        let internalModel = expectedInternalModels[i];

        if (!found[internalModel.id]) {
          missingInternalModels.push(internalModel);
        }
      }

      if (missingInternalModels.length) {
        warn('Ember Data expected to find records with the following ids in the adapter response but they were missing: ' + inspect(missingInternalModels.map(r => r.id)), false, {
          id: 'ds.store.missing-records-from-adapter'
        });
        rejectInternalModels(missingInternalModels);
      }
    }

    function rejectInternalModels(internalModels, error) {
      for (let i = 0, l = internalModels.length; i < l; i++) {
        let pair = seeking[internalModels[i].id];

        if (pair) {
          pair.resolver.reject(error);
        }
      }
    }

    if (shouldCoalesce) {
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
      let snapshots = new Array(totalItems);
      for (let i = 0; i < totalItems; i++) {
        snapshots[i] = internalModels[i].createSnapshot();
      }

      let groups = adapter.groupRecordsForFindMany(this, snapshots);

      for (let i = 0, l = groups.length; i < l; i++) {
        let group = groups[i];
        let totalInGroup = groups[i].length;
        let ids = new Array(totalInGroup);
        let groupedInternalModels = new Array(totalInGroup);

        for (let j = 0; j < totalInGroup; j++) {
          let internalModel = group[j]._internalModel;

          groupedInternalModels[j] = internalModel;
          ids[j] = internalModel.id;
        }

        if (totalInGroup > 1) {
          _findMany(adapter, store, modelClass, ids, groupedInternalModels)
            .then(function(foundInternalModels) {
              handleFoundRecords(foundInternalModels, groupedInternalModels);
            })
            .catch(function(error) {
              rejectInternalModels(groupedInternalModels, error);
            });
        } else if (ids.length === 1) {
          let pair = seeking[groupedInternalModels[0].id];
          _fetchRecord(pair);
        } else {
          assert("You cannot return an empty array from adapter's method groupRecordsForFindMany", false);
        }
      }
    } else {
      for (let i = 0; i < totalItems; i++) {
        _fetchRecord(pendingFetchItems[i]);
      }
    }
  },

  /**
    Get the reference for the specified record.

    Example

    ```javascript
    let userRef = store.getReference('user', 1);

    // check if the user is loaded
    let isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    let user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
    let id = userRef.id();
    }

    // load user (via store.find)
    userRef.load().then(...)

    // or trigger a reload
    userRef.reload().then(...)

    // provide data for reference
    userRef.push({ id: 1, username: "@user" }).then(function(user) {
    userRef.value() === user;
    });
    ```

    @method getReference
    @param {String} type
    @param {String|Integer} id
    @since 2.5.0
    @return {RecordReference}
  */
  getReference: function(type, id) {
    return this._internalModelForId(type, id).recordReference;
  },

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it is available in the store,
    otherwise it will return `null`. A record is available if it has been fetched earlier, or
    pushed manually into the store.

    _Note: This is an synchronous method and does not return a promise._

    ```js
    let post = store.peekRecord('post', 1);

    post.get('id'); // 1
    ```

    @since 1.13.0
    @method peekRecord
    @param {String} modelName
    @param {String|Integer} id
    @return {DS.Model|null} record
  */
  peekRecord(modelName, id) {
    heimdall.increment(peekRecord);
    assert("You need to pass a model name to the store's peekRecord method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
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
  // TODO @runspired this should be underscored
  reloadRecord(internalModel) {
    let modelName = internalModel.type.modelName;
    let adapter = this.adapterFor(modelName);
    let id = internalModel.id;

    assert("You cannot reload a record without an ID", id);
    assert("You tried to reload a record but you have no adapter (for " + modelName + ")", adapter);
    assert("You tried to reload a record but your adapter does not implement `findRecord`", typeof adapter.findRecord === 'function' || typeof adapter.find === 'function');

    return this._scheduleFetch(internalModel);
  },

  /**
   This method returns true if a record for a given modelName and id is already
   loaded in the store. Use this function to know beforehand if a findRecord()
   will result in a request or that it will be a cache hit.

   Example

   ```javascript
   store.hasRecordForId('post', 1); // false
   store.findRecord('post', 1).then(function() {
      store.hasRecordForId('post', 1); // true
    });
   ```

    @method hasRecordForId
    @param {String} modelName
    @param {(String|Integer)} id
    @return {Boolean}
  */
  hasRecordForId(modelName, id) {
    assert("You need to pass a model name to the store's hasRecordForId method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');

    let trueId = coerceId(id);
    let modelClass = this.modelFor(modelName);
    let internalModel = this.typeMapFor(modelClass).idToRecord[trueId];

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
  recordForId(modelName, id) {
    assert("You need to pass a model name to the store's recordForId method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    return this._internalModelForId(modelName, id).getRecord();
  },

  _internalModelForId(modelName, inputId) {
    heimdall.increment(_internalModelForId);
    let modelClass = this.modelFor(modelName);
    let id = coerceId(inputId);
    let idToRecord = this.typeMapFor(modelClass).idToRecord;
    let internalModel = idToRecord[id];

    if (!internalModel || !idToRecord[id]) {
      internalModel = this.buildInternalModel(modelClass, id);
    }

    return internalModel;
  },



  /**
    @method findMany
    @private
    @param {Array} internalModels
    @return {Promise} promise
  */
  findMany(internalModels) {
    let finds = new Array(internalModels.length);

    for (let i = 0; i < internalModels.length; i++) {
      finds[i] = this._findByInternalModel(internalModels[i]);
    }

    return Promise.all(finds);
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
  findHasMany(owner, link, relationship) {
    let adapter = this.adapterFor(owner.type.modelName);

    assert("You tried to load a hasMany relationship but you have no adapter (for " + owner.type + ")", adapter);
    assert("You tried to load a hasMany relationship from a specified `link` in the original payload but your adapter does not implement `findHasMany`", typeof adapter.findHasMany === 'function');

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
  findBelongsTo(owner, link, relationship) {
    let adapter = this.adapterFor(owner.type.modelName);

    assert("You tried to load a belongsTo relationship but you have no adapter (for " + owner.type + ")", adapter);
    assert("You tried to load a belongsTo relationship from a specified `link` in the original payload but your adapter does not implement `findBelongsTo`", typeof adapter.findBelongsTo === 'function');

    return _findBelongsTo(adapter, this, owner, link, relationship);
  },

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    ---

    If you do something like this:

    ```javascript
    store.query('person', { page: 1 });
    ```

    The call made to the server, using a Rails backend, will look something like this:

    ```
    Started GET "/api/v1/person?page=1"
    Processing by Api::V1::PersonsController#index as HTML
    Parameters: { "page"=>"1" }
    ```

    ---

    If you do something like this:

    ```javascript
    store.query('person', { ids: [1, 2, 3] });
    ```

    The call to the server, using a Rails backend, will look something like this:

    ```
    Started GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
    Processing by Api::V1::PersonsController#index as HTML
    Parameters: { "ids" => ["1", "2", "3"] }
    ```

    This method returns a promise, which is resolved with an
    [`AdapterPopulatedRecordArray`](http://emberjs.com/api/data/classes/DS.AdapterPopulatedRecordArray.html)
    once the server returns.

    @since 1.13.0
    @method query
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise
  */
  query(modelName, query) {
    return this._query(modelName, query);
  },

  _query(modelName, query, array) {
    let token = heimdall.start('store._query');
    assert("You need to pass a model name to the store's query method", isPresent(modelName));
    assert("You need to pass a query hash to the store's query method", query);
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    let modelClass = this.modelFor(modelName);

    array = array || this.recordArrayManager
      .createAdapterPopulatedRecordArray(modelClass, query);

    let adapter = this.adapterFor(modelName);

    assert("You tried to load a query but you have no adapter (for " + modelClass.modelName + ")", adapter);
    assert("You tried to load a query but your adapter does not implement `query`", typeof adapter.query === 'function');

    let pA = promiseArray(_query(adapter, this, modelClass, query, array));
    instrument(() => {
      pA.finally(() => { heimdall.stop(token); });
    });
    return pA;
  },

  /**
    This method makes a request for one record, where the `id` is not known
    beforehand (if the `id` is known, use [`findRecord`](#method_findRecord)
    instead).

    This method can be used when it is certain that the server will return a
    single object for the primary data.

    Let's assume our API provides an endpoint for the currently logged in user
    via:

    ```
    // GET /api/current_user
    {
      user: {
        id: 1234,
        username: 'admin'
      }
    }
    ```

    Since the specific `id` of the `user` is not known beforehand, we can use
    `queryRecord` to get the user:

    ```javascript
    store.queryRecord('user', {}).then(function(user) {
      let username = user.get('username');
      console.log(`Currently logged in as ${username}`);
    });
    ```

    The request is made through the adapters' `queryRecord`:

    ```app/adapters/user.js
    import DS from "ember-data";

    export default DS.Adapter.extend({
      queryRecord(modelName, query) {
        return Ember.$.getJSON("/api/current_user");
      }
    });
    ```

    Note: the primary use case for `store.queryRecord` is when a single record
    is queried and the `id` is not known beforehand. In all other cases
    `store.query` and using the first item of the array is likely the preferred
    way:

    ```
    // GET /users?username=unique
    {
      data: [{
        id: 1234,
        type: 'user',
        attributes: {
          username: "unique"
        }
      }]
    }
    ```

    ```javascript
    store.query('user', { username: 'unique' }).then(function(users) {
      return users.get('firstObject');
    }).then(function(user) {
      let id = user.get('id');
    });
    ```

    This method returns a promise, which resolves with the found record.

    If the adapter returns no data for the primary data of the payload, then
    `queryRecord` resolves with `null`:

    ```
    // GET /users?username=unique
    {
      data: null
    }
    ```

    ```javascript
    store.queryRecord('user', { username: 'unique' }).then(function(user) {
      console.log(user); // null
    });
    ```

    @since 1.13.0
    @method queryRecord
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @return {Promise} promise which resolves with the found record or `null`
  */
  queryRecord(modelName, query) {
    assert("You need to pass a model name to the store's queryRecord method", isPresent(modelName));
    assert("You need to pass a query hash to the store's queryRecord method", query);
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');

    let modelClass = this.modelFor(modelName);
    let adapter = this.adapterFor(modelName);

    assert("You tried to make a query but you have no adapter (for " + modelName + ")", adapter);
    assert("You tried to make a query but your adapter does not implement `queryRecord`", typeof adapter.queryRecord === 'function');

    return promiseObject(_queryRecord(adapter, this, modelClass, query).then((internalModel) => {
      // the promise returned by store.queryRecord is expected to resolve with
      // an instance of DS.Model
      if (internalModel) {
        return internalModel.getRecord();
      }

      return null;
    }));
  },

  /**
    `findAll` asks the adapter's `findAll` method to find the records for the
    given type, and returns a promise which will resolve with all records of
    this type present in the store, even if the adapter only returns a subset
    of them.

    ```app/routes/authors.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
        return this.store.findAll('author');
      }
    });
    ```

    _When_ the returned promise resolves depends on the reload behavior,
    configured via the passed `options` hash and the result of the adapter's
    `shouldReloadAll` method.

    ### Reloading

    If `{ reload: true }` is passed or `adapter.shouldReloadAll` evaluates to
    `true`, then the returned promise resolves once the adapter returns data,
    regardless if there are already records in the store:

    ```js
    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    // adapter#findAll resolves with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]
    store.findAll('author', { reload: true }).then(function(authors) {
      authors.getEach("id"); // ['first', 'second']
    });
    ```

    If no reload is indicated via the abovementioned ways, then the promise
    immediately resolves with all the records currently loaded in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadAll` evaluates to `true`,
    then a background reload is started. Once this resolves, the array with
    which the promise resolves, is updated automatically so it contains all the
    records in the store:

    ```js
    // app/adapters/application.js
    export default DS.Adapter.extend({
      shouldReloadAll(store, snapshotsArray) {
        return false;
      },

      shouldBackgroundReloadAll(store, snapshotsArray) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    let allAuthors;
    store.findAll('author').then(function(authors) {
      authors.getEach('id'); // ['first']

      allAuthors = authors;
    });

    // later, once adapter#findAll resolved with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]

    allAuthors.getEach('id'); // ['first', 'second']
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findAll`.

    ```app/routes/post/edit.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function() {
        return this.store.findAll('post', { backgroundReload: false });
      }
    });
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to you adapter via the `snapshotRecordArray`

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function(params) {
        return this.store.findAll('post', {
          adapterOptions: { subscribe: false }
        });
      }
    });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default MyCustomAdapter.extend({
      findAll: function(store, type, sinceToken, snapshotRecordArray) {
        if (snapshotRecordArray.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    });
    ```


    See [peekAll](#method_peekAll) to get an array of current records in the
    store, without waiting until a reload is finished.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](http://emberjs.com/api/data/classes/DS.JSONAPIAdapter.html)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findAll()` to automatically retrieve additional records related to
    those requested by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve all of the post records we can have the server also return
    all of the posts' comments in the same request:

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function() {
       return this.store.findAll('post', {include: 'comments'});
      }
    });

    ```
    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the posts'
    comments and the authors of those comments the request would look like this:

    ```app/routes/posts.js
    import Ember from 'ember';

    export default Ember.Route.extend({
      model: function() {
       return this.store.findAll('post', {include: 'comments,comments.author'});
      }
    });

    ```

    See [query](#method_query) to only get a subset of records from the server.

    @since 1.13.0
    @method findAll
    @param {String} modelName
    @param {Object} options
    @return {Promise} promise
  */
  findAll(modelName, options) {
    assert("You need to pass a model name to the store's findAll method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    let token = heimdall.start('store.findAll');
    let modelClass = this.modelFor(modelName);

    let fetch = this._fetchAll(modelClass, this.peekAll(modelName), options);

    instrument(() => {
      fetch.finally(() => { heimdall.stop(token); });
    });

    return fetch;
  },

  /**
    @method _fetchAll
    @private
    @param {DS.Model} modelClass
    @param {DS.RecordArray} array
    @return {Promise} promise
  */
  _fetchAll(modelClass, array, options) {
    options = options || {};

    let adapter = this.adapterFor(modelClass.modelName);
    let sinceToken = this.typeMapFor(modelClass).metadata.since;

    assert("You tried to load all records but you have no adapter (for " + modelClass.modelName + ")", adapter);
    assert("You tried to load all records but your adapter does not implement `findAll`", typeof adapter.findAll === 'function');

    if (options.reload) {
      set(array, 'isUpdating', true);
      return promiseArray(_findAll(adapter, this, modelClass, sinceToken, options));
    }

    let snapshotArray = array._createSnapshot(options);

    if (adapter.shouldReloadAll(this, snapshotArray)) {
      set(array, 'isUpdating', true);
      return promiseArray(_findAll(adapter, this, modelClass, sinceToken, options));
    }

    if (options.backgroundReload === false) {
      return promiseArray(Promise.resolve(array));
    }

    if (options.backgroundReload || adapter.shouldBackgroundReloadAll(this, snapshotArray)) {
      set(array, 'isUpdating', true);
      _findAll(adapter, this, modelClass, sinceToken, options);
    }

    return promiseArray(Promise.resolve(array));
  },

  /**
    @method didUpdateAll
    @param {DS.Model} modelClass
    @private
  */
  didUpdateAll(modelClass) {
    heimdall.increment(didUpdateAll);
    let liveRecordArray = this.recordArrayManager.liveRecordArrayFor(modelClass);

    set(liveRecordArray, 'isUpdating', false);
  },

  /**
    This method returns a filtered array that contains all of the
    known records for a given type in the store.

    Note that because it's just a filter, the result will contain any
    locally created records of the type, however, it will not make a
    request to the backend to retrieve additional records. If you
    would like to request all the records from the backend please use
    [store.findAll](#method_findAll).

    Also note that multiple calls to `peekAll` for a given type will always
    return the same `RecordArray`.

    Example

    ```javascript
    let localPosts = store.peekAll('post');
    ```

    @since 1.13.0
    @method peekAll
    @param {String} modelName
    @return {DS.RecordArray}
  */
  peekAll(modelName) {
    heimdall.increment(peekAll);
    assert("You need to pass a model name to the store's peekAll method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    let modelClass = this.modelFor(modelName);
    let liveRecordArray = this.recordArrayManager.liveRecordArrayFor(modelClass);

    this.recordArrayManager.syncLiveRecordArray(liveRecordArray, modelClass);

    return liveRecordArray;
  },

  /**
   This method unloads all records in the store.
   It schedules unloading to happen during the next run loop.

   Optionally you can pass a type which unload all records for a given type.

   ```javascript
   store.unloadAll();
   store.unloadAll('post');
   ```

   @method unloadAll
   @param {String} modelName
  */
  unloadAll(modelName) {
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), !modelName || typeof modelName === 'string');

    if (arguments.length === 0) {
      let typeMaps = this.typeMaps;
      let keys = Object.keys(typeMaps);
      let types = new Array(keys.length);

      for (let i = 0; i < keys.length; i++) {
        types[i] = typeMaps[keys[i]]['type'].modelName;
      }

      types.forEach(this.unloadAll, this);
    } else {
      let modelClass = this.modelFor(modelName);
      let typeMap = this.typeMapFor(modelClass);
      let records = typeMap.records.slice();
      let record;

      for (let i = 0; i < records.length; i++) {
        record = records[i];
        record.unloadRecord();
        record.destroy(); // maybe within unloadRecord
      }

      typeMap.metadata = new EmptyObject();
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
    [query](#method_query) with that same query, to fetch additional records
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
      let unreadPost = unreadPosts.objectAt(0);
      unreadPost.set('unread', false);
      unreadPosts.get('length'); // 4
    });
    ```

    @method filter
    @private
    @param {String} modelName
    @param {Object} query optional query
    @param {Function} filter
    @return {DS.PromiseArray}
    @deprecated
  */
  filter(modelName, query, filter) {
    assert("You need to pass a model name to the store's filter method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');

    if (!ENV.ENABLE_DS_FILTER) {
      assert('The filter API has been moved to a plugin. To enable store.filter using an environment flag, or to use an alternative, you can visit the ember-data-filter addon page. https://github.com/ember-data/ember-data-filter', false);
    }

    let promise;
    let length = arguments.length;
    let array;
    let hasQuery = length === 3;

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

    promise = promise || Promise.resolve(array);

    return promiseArray(promise.then(() => array, null, 'DS: Store#filter of ' + modelName));
  },

  /**
    This method has been deprecated and is an alias for store.hasRecordForId, which should
    be used instead.

    @deprecated
    @method recordIsLoaded
    @param {String} modelName
    @param {string} id
    @return {boolean}
  */
  recordIsLoaded(modelName, id) {
    deprecate(`Use of recordIsLoaded is deprecated, use hasRecordForId instead.`, {
      id: 'ds.store.recordIsLoaded',
      until: '3.0'
    });
    return this.hasRecordForId(modelName, id);
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
  dataWasUpdated(type, internalModel) {
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
  scheduleSave(internalModel, resolver, options) {
    let snapshot = internalModel.createSnapshot(options);
    internalModel.flushChangedAttributes();
    internalModel.adapterWillCommit();
    this._pendingSave.push({
      snapshot: snapshot,
      resolver: resolver
    });
    emberRun.once(this, this.flushPendingSave);
  },

  /**
    This method is called at the end of the run loop, and
    flushes any records passed into `scheduleSave`

    @method flushPendingSave
    @private
  */
  flushPendingSave() {
    let pending = this._pendingSave.slice();
    this._pendingSave = [];

    pending.forEach((pendingItem) => {
      let snapshot = pendingItem.snapshot;
      let resolver = pendingItem.resolver;
      let record = snapshot._internalModel;
      let adapter = this.adapterFor(record.modelClass.modelName);
      let operation;

      if (get(record, 'currentState.stateName') === 'root.deleted.saved') {
        return resolver.resolve();
      } else if (record.isNew()) {
        operation = 'createRecord';
      } else if (record.isDeleted()) {
        operation = 'deleteRecord';
      } else {
        operation = 'updateRecord';
      }

      resolver.resolve(_commit(adapter, this, operation, snapshot));
    });
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
  didSaveRecord(internalModel, dataArg) {
    let data;
    if (dataArg) {
      data = dataArg.data;
    }
    if (data) {
      // normalize relationship IDs into records
      this._backburner.schedule('normalizeRelationships', this, this._setupRelationships, internalModel, data);
      this.updateId(internalModel, data);
    } else {
      assert(`Your ${internalModel.type.modelName} record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response.`, internalModel.id);
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
  recordWasInvalid(internalModel, errors) {
    internalModel.adapterDidInvalidate(errors);
  },

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected (with anything other than a `DS.InvalidError`).

    @method recordWasError
    @private
    @param {InternalModel} internalModel
    @param {Error} error
  */
  recordWasError(internalModel, error) {
    internalModel.adapterDidError(error);
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
  updateId(internalModel, data) {
    let oldId = internalModel.id;
    let id = coerceId(data.id);

    // ID absolutely can't be missing if the oldID is empty (missing Id in response for a new record)
    assert(`'${internalModel.type.modelName}' was saved to the server, but the response does not have an id and your record does not either.`, !(id === null && oldId === null));

    // ID absolutely can't be different than oldID if oldID is not null
    assert(`'${internalModel.type.modelName}:${oldId}' was saved to the server, but the response returned the new id '${id}'. The store cannot assign a new id to a record that already has an id.`, !(oldId !== null && id !== oldId));

    // ID can be null if oldID is not null (altered ID in response for a record)
    // however, this is more than likely a developer error.
    if (oldId !== null && id === null) {
      warn(`Your ${internalModel.type.modelName} record was saved to the server, but the response does not have an id.`, !(oldId !== null && id === null));
      return;
    }

    this.typeMapFor(internalModel.type).idToRecord[id] = internalModel;

    internalModel.setId(id);
  },

  /**
    Returns a map of IDs to client IDs for a given type.

    @method typeMapFor
    @private
    @param {DS.Model} modelClass
    @return {Object} typeMap
  */
  typeMapFor(modelClass) {
    heimdall.increment(typeMapFor);
    let typeMaps = get(this, 'typeMaps');
    let guid = guidFor(modelClass);
    let typeMap = typeMaps[guid];

    if (typeMap) { return typeMap; }

    heimdall.increment(typeMapFor_allocate);
    typeMap = {
      idToRecord: new EmptyObject(),
      records: [],
      metadata: new EmptyObject(),
      type: modelClass
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
  _load(data) {
    heimdall.increment(_load);
    let internalModel = this._internalModelForId(data.type, data.id);

    internalModel.setupData(data);

    this.recordArrayManager.recordDidChange(internalModel);

    return internalModel;
  },

  /*
    In case someone defined a relationship to a mixin, for example:
    ```
      let Comment = DS.Model.extend({
        owner: belongsTo('commentable'. { polymorphic: true})
      });
      let Commentable = Ember.Mixin.create({
        comments: hasMany('comment')
      });
    ```
    we want to look up a Commentable class which has all the necessary
    relationship metadata. Thus, we look up the mixin and create a mock
    DS.Model, so we can access the relationship CPs of the mixin (`comments`)
    in this case
  */

  _modelForMixin(modelName) {
    heimdall.increment(_modelForMixin);
    let normalizedModelName = normalizeModelName(modelName);
    // container.registry = 2.1
    // container._registry = 1.11 - 2.0
    // container = < 1.11
    let owner = getOwner(this);

    let mixin = owner._lookupFactory('mixin:' + normalizedModelName);
    if (mixin) {
      //Cache the class as a model
      owner.register('model:' + normalizedModelName, Model.extend(mixin));
    }
    let factory = this.modelFactoryFor(normalizedModelName);
    if (factory) {
      factory.__isMixin = true;
      factory.__mixin = mixin;
    }

    return factory;
  },

  /**
    Returns the model class for the particular `modelName`.

    The class of a model might be useful if you want to get a list of all the
    relationship names of the model, see
    [`relationshipNames`](http://emberjs.com/api/data/classes/DS.Model.html#property_relationshipNames)
    for example.

    @method modelFor
    @param {String} modelName
    @return {DS.Model}
  */
  modelFor(modelName) {
    heimdall.increment(modelFor);
    assert("You need to pass a model name to the store's modelFor method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');

    let factory = this.modelFactoryFor(modelName);
    if (!factory) {
      //Support looking up mixins as base types for polymorphic relationships
      factory = this._modelForMixin(modelName);
    }
    if (!factory) {
      throw new EmberError("No model was found for '" + modelName + "'");
    }
    factory.modelName = factory.modelName || normalizeModelName(modelName);

    return factory;
  },

  modelFactoryFor(modelName) {
    heimdall.increment(modelFactoryFor);
    assert("You need to pass a model name to the store's modelFactoryFor method", isPresent(modelName));
    assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ inspect(modelName), typeof modelName === 'string');
    let normalizedKey = normalizeModelName(modelName);

    let owner = getOwner(this);

    return owner._lookupFactory('model:' + normalizedKey);
  },

  /**
    Push some data for a given type into the store.

    This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:
    - record's `type` should always be in singular, dasherized form
    - members (properties) should be camelCased

    [Your primary data should be wrapped inside `data` property](http://jsonapi.org/format/#document-top-level):

    ```js
    store.push({
      data: {
        // primary data for single record of type `Person`
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Daniel',
          lastName: 'Kmak'
        }
      }
    });
    ```

    [Demo.](http://ember-twiddle.com/fb99f18cd3b4d3e2a4c7)

    `data` property can also hold an array (of records):

    ```js
    store.push({
      data: [
        // an array of records
        {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Daniel',
            lastName: 'Kmak'
          }
        },
        {
          id: '2',
          type: 'person',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale'
          }
        }
      ]
    });
    ```

    [Demo.](http://ember-twiddle.com/69cdbeaa3702159dc355)

    There are some typical properties for `JSONAPI` payload:
    * `id` - mandatory, unique record's key
    * `type` - mandatory string which matches `model`'s dasherized name in singular form
    * `attributes` - object which holds data for record attributes - `DS.attr`'s declared in model
    * `relationships` - object which must contain any of the following properties under each relationships' respective key (example path is `relationships.achievements.data`):
      - [`links`](http://jsonapi.org/format/#document-links)
      - [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
      - [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

    For this model:

    ```app/models/person.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),

      children: DS.hasMany('person')
    });
    ```

    To represent the children as IDs:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            data: [
              {
                id: '2',
                type: 'person'
              },
              {
                id: '3',
                type: 'person'
              },
              {
                id: '4',
                type: 'person'
              }
            ]
          }
        }
      }
    }
    ```

    [Demo.](http://ember-twiddle.com/343e1735e034091f5bde)

    To represent the children relationship as a URL:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            links: {
              related: '/people/1/children'
            }
          }
        }
      }
    }
    ```

    If you're streaming data or implementing an adapter, make sure
    that you have converted the incoming data into this form. The
    store's [normalize](#method_normalize) method is a convenience
    helper for converting a json payload into the form Ember Data
    expects.

    ```js
    store.push(store.normalize('person', data));
    ```

    This method can be used both to push in brand new
    records, as well as to update existing records.

    @method push
    @param {Object} data
    @return {DS.Model|Array} the record(s) that was created or
      updated.
  */
  push(data) {
    let token = heimdall.start('store.push');
    let pushed = this._push(data);

    if (Array.isArray(pushed)) {
      let records = pushed.map(function(internalModel) {
        return internalModel.getRecord();
      });
      heimdall.stop(token);
      return records;
    }

    if (pushed === null) {
      heimdall.stop(token);
      return null;
    }

    let record = pushed.getRecord();
    heimdall.stop(token);
    return record;
  },

  /*
    Push some data into the store, without creating materialized records.

    @method _push
    @private
    @param {Object} data
    @return {DS.InternalModel|Array<DS.InternalModel>} pushed InternalModel(s)
  */
  _push(data) {
    let token = heimdall.start('store._push');
    let included = data.included;
    let i, length;

    if (included) {
      for (i = 0, length = included.length; i < length; i++) {
        this._pushInternalModel(included[i]);
      }
    }

    if (Array.isArray(data.data)) {
      length = data.data.length;
      let internalModels = new Array(length);

      for (i = 0; i < length; i++) {
        internalModels[i] = this._pushInternalModel(data.data[i]);
      }
      heimdall.stop(token);
      return internalModels;
    }

    if (data.data === null) {
      heimdall.stop(token);
      return null;
    }

    assert(`Expected an object in the 'data' property in a call to 'push' for ${data.type}, but was ${typeOf(data.data)}`, typeOf(data.data) === 'object');

    let internalModel = this._pushInternalModel(data.data);

    heimdall.stop(token);
    return internalModel;
  },

  _hasModelFor(modelName) {
    return !!getOwner(this)._lookupFactory(`model:${modelName}`);
  },

  _pushInternalModel(data) {
    heimdall.increment(_pushInternalModel);
    let modelName = data.type;
    assert(`You must include an 'id' for ${modelName} in an object passed to 'push'`, data.id !== null && data.id !== undefined && data.id !== '');
    assert(`You tried to push data with a type '${modelName}' but no model could be found with that name.`, this._hasModelFor(modelName));

    runInDebug(() => {
      // If ENV.DS_WARN_ON_UNKNOWN_KEYS is set to true and the payload
      // contains unknown attributes or relationships, log a warning.

      if (ENV.DS_WARN_ON_UNKNOWN_KEYS) {
        let modelClass = this.modelFor(modelName);

        // Check unknown attributes
        let unknownAttributes = Object.keys(data.attributes || {}).filter((key) => {
          return !get(modelClass, 'fields').has(key);
        });
        let unknownAttributesMessage = `The payload for '${modelClass.modelName}' contains these unknown attributes: ${unknownAttributes}. Make sure they've been defined in your model.`;
        warn(unknownAttributesMessage, unknownAttributes.length === 0, { id: 'ds.store.unknown-keys-in-payload' });

        // Check unknown relationships
        let unknownRelationships = Object.keys(data.relationships || {}).filter((key) => {
          return !get(modelClass, 'fields').has(key);
        });
        let unknownRelationshipsMessage = `The payload for '${modelClass.modelName}' contains these unknown relationships: ${unknownRelationships}. Make sure they've been defined in your model.`;
        warn(unknownRelationshipsMessage, unknownRelationships.length === 0, { id: 'ds.store.unknown-keys-in-payload' });
      }
    });

    // Actually load the record into the store.
    let internalModel = this._load(data);

    this._backburner.join(() => {
      this._backburner.schedule('normalizeRelationships', this, this._setupRelationships, internalModel, data);
    });

    return internalModel;
  },

  _setupRelationships(record, data) {
    heimdall.increment(_setupRelationships);
    // This will convert relationships specified as IDs into DS.Model instances
    // (possibly unloaded) and also create the data structures used to track
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
    let pushData = {
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
  pushPayload(modelName, inputPayload) {
    let serializer;
    let payload;
    if (!inputPayload) {
      payload = modelName;
      serializer = defaultSerializer(this);
      assert("You cannot use `store#pushPayload` without a modelName unless your default serializer defines `pushPayload`", typeof serializer.pushPayload === 'function');
    } else {
      payload = inputPayload;
      assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${inspect(modelName)}`, typeof modelName === 'string');
      serializer = this.serializerFor(modelName);
    }
    if (isEnabled('ds-pushpayload-return')) {
      return this._adapterRun(() => { return serializer.pushPayload(this, payload); });
    } else {
      this._adapterRun(() => serializer.pushPayload(this, payload));
    }
  },

  /**
    `normalize` converts a json payload into the normalized form that
    [push](#method_push) expects.

    Example

    ```js
    socket.on('message', function(message) {
      let modelName = message.model;
      let data = message.data;
      store.push(store.normalize(modelName, data));
    });
    ```

    @method normalize
    @param {String} modelName The name of the model type for this payload
    @param {Object} payload
    @return {Object} The normalized payload
  */
  normalize(modelName, payload) {
    heimdall.increment(normalize);
    assert("You need to pass a model name to the store's normalize method", isPresent(modelName));
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${inspect(modelName)}`, typeof modelName === 'string');
    let serializer = this.serializerFor(modelName);
    let model = this.modelFor(modelName);
    return serializer.normalize(model, payload);
  },

  /**
    Build a brand new record for a given type, ID, and
    initial data.

    @method buildRecord
    @private
    @param {DS.Model} modelClass
    @param {String} id
    @param {Object} data
    @return {InternalModel} internal model
  */
  buildInternalModel(modelClass, id, data) {
    heimdall.increment(buildInternalModel);
    let typeMap = this.typeMapFor(modelClass);
    let idToRecord = typeMap.idToRecord;

    assert(`The id ${id} has already been used with another record for modelClass ${modelClass}.`, !id || !idToRecord[id]);
    assert(`'${inspect(modelClass)}' does not appear to be an ember-data model`, (typeof modelClass._create === 'function') );

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    let internalModel = new InternalModel(modelClass, id, this, data);

    // if we're creating an item, this process will be done
    // later, once the object has been persisted.
    if (id) {
      idToRecord[id] = internalModel;
    }

    typeMap.records.push(internalModel);

    return internalModel;
  },

  //Called by the state machine to notify the store that the record is ready to be interacted with
  recordWasLoaded(record) {
    this.recordArrayManager.recordWasLoaded(record);
  },

  // ...............
  // . DESTRUCTION .
  // ...............

  /**
    When a record is destroyed, this un-indexes it and
    removes it from any record arrays so it can be GCed.

    @method _dematerializeRecord
    @private
    @param {InternalModel} internalModel
  */
  _dematerializeRecord(internalModel) {
    let modelClass = internalModel.type;
    let typeMap = this.typeMapFor(modelClass);
    let id = internalModel.id;

    internalModel.updateRecordArrays();

    if (id) {
      delete typeMap.idToRecord[id];
    }

    let loc = typeMap.records.indexOf(internalModel);
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
    @public
    @param {String} modelName
    @return DS.Adapter
  */
  adapterFor(modelName) {
    heimdall.increment(adapterFor);
    assert("You need to pass a model name to the store's adapterFor method", isPresent(modelName));
    assert(`Passing classes to store.adapterFor has been removed. Please pass a dasherized string instead of ${inspect(modelName)}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);

    return this._instanceCache.get('adapter', normalizedModelName);
  },

  _adapterRun(fn) {
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
    @public
    @param {String} modelName the record to serialize
    @return {DS.Serializer}
  */
  serializerFor(modelName) {
    heimdall.increment(serializerFor);
    assert("You need to pass a model name to the store's serializerFor method", isPresent(modelName));
    assert(`Passing classes to store.serializerFor has been removed. Please pass a dasherized string instead of ${inspect(modelName)}`, typeof modelName === 'string');

    let normalizedModelName = normalizeModelName(modelName);

    return this._instanceCache.get('serializer', normalizedModelName);
  },

  lookupAdapter(name) {
    deprecate(`Use of lookupAdapter is deprecated, use adapterFor instead.`, {
      id: 'ds.store.lookupAdapter',
      until: '3.0'
    });
    return this.adapterFor(name);
  },

  lookupSerializer(name) {
    deprecate(`Use of lookupSerializer is deprecated, use serializerFor instead.`, {
      id: 'ds.store.lookupSerializer',
      until: '3.0'
    });
    return this.serializerFor(name);
  },

  willDestroy() {
    this._super(...arguments);
    this.recordArrayManager.destroy();
    this._instanceCache.destroy();

    this.unloadAll();
  },

  _pushResourceIdentifier(relationship, resourceIdentifier) {
    if (isNone(resourceIdentifier)) {
      return;
    }

    assert(`A ${relationship.parentType} record was pushed into the store with the value of ${relationship.key} being ${inspect(resourceIdentifier)}, but ${relationship.key} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`, !Array.isArray(resourceIdentifier));

    //TODO:Better asserts
    return this._internalModelForId(resourceIdentifier.type, resourceIdentifier.id);
  },

  _pushResourceIdentifiers(relationship, resourceIdentifiers) {
    if (isNone(resourceIdentifiers)) {
      return;
    }

    assert(`A ${relationship.parentType} record was pushed into the store with the value of ${relationship.key} being '${inspect(resourceIdentifiers)}', but ${relationship.key} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`, Array.isArray(resourceIdentifiers));

    let _internalModels = new Array(resourceIdentifiers.length);
    for (let i = 0; i < resourceIdentifiers.length; i++) {
      _internalModels[i] = this._pushResourceIdentifier(relationship, resourceIdentifiers[i]);
    }
    return _internalModels;
  }
});

// Delegation to the adapter and promise management



function defaultSerializer(store) {
  return store.serializerFor('application');
}

function _commit(adapter, store, operation, snapshot) {
  let internalModel = snapshot._internalModel;
  let modelName = snapshot.modelName;
  let modelClass = store.modelFor(modelName);
  assert(`You tried to update a record but you have no adapter (for ${modelClass.modelName})`, adapter);
  assert(`You tried to update a record but your adapter (for ${modelClass.modelName}) does not implement '${operation}'`, typeof adapter[operation] === 'function');
  let promise = adapter[operation](store, modelClass, snapshot);
  let serializer = serializerForAdapter(store, adapter, modelName);
  let label = `DS: Extract and notify about ${operation} completion of ${internalModel}`;

  assert(`Your adapter's '${operation}' method must return a value, but it returned 'undefined'`, promise !==undefined);

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then((adapterPayload) => {
    store._adapterRun(() => {
      let payload, data;
      if (adapterPayload) {
        payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, snapshot.id, operation);
        if (payload.included) {
          store.push({ data: payload.included });
        }
        data = payload.data;
      }
      store.didSaveRecord(internalModel, { data });
    });

    return internalModel;
  }, function(error) {
    if (error instanceof InvalidError) {
      let errors = serializer.extractErrors(store, modelClass, error, snapshot.id);

      store.recordWasInvalid(internalModel, errors);
    } else {
      store.recordWasError(internalModel, error);
    }

    throw error;
  }, label);
}

function setupRelationships(store, record, data) {
  if (!data.relationships) {
    return;
  }

  record.type.eachRelationship((key, descriptor) => {
    if (!data.relationships[key]) {
      return;
    }

    let relationship = record._relationships.get(key);
    relationship.push(data.relationships[key]);
  });
}

export { Store };
export default Store;
