import RootState from "ember-data/system/model/states";
import Errors from "ember-data/system/model/errors";
import { PromiseObject } from "ember-data/system/promise-proxies";
import merge from "ember-data/system/merge";
import JSONSerializer from "ember-data/serializers/json-serializer";
import createRelationshipFor from "ember-data/system/relationships/state/create";
import Snapshot from "ember-data/system/snapshot";

/**
  @module ember-data
*/

var get = Ember.get;
var set = Ember.set;
var Promise = Ember.RSVP.Promise;
var forEach = Ember.ArrayPolyfills.forEach;
var map = Ember.ArrayPolyfills.map;

var retrieveFromCurrentState = Ember.computed('currentState', function(key, value) {
  return get(get(this, 'currentState'), key);
}).readOnly();

var _extractPivotNameCache = Ember.create(null);
var _splitOnDotCache = Ember.create(null);

function splitOnDot(name) {
  return _splitOnDotCache[name] || (
    _splitOnDotCache[name] = name.split('.')
  );
}

function extractPivotName(name) {
  return _extractPivotNameCache[name] || (
    _extractPivotNameCache[name] = splitOnDot(name)[0]
  );
}

// Like Ember.merge, but instead returns a list of keys
// for values that fail a strict equality check
// instead of the original object.
function mergeAndReturnChangedKeys(original, updates) {
  var changedKeys = [];

  if (!updates || typeof updates !== 'object') {
    return changedKeys;
  }

  var keys   = Ember.keys(updates);
  var length = keys.length;
  var i, val, key;

  for (i = 0; i < length; i++) {
    key = keys[i];
    val = updates[key];

    if (original[key] !== val) {
      changedKeys.push(key);
    }

    original[key] = val;
  }
  return changedKeys;
}

/**

  The model class that all Ember Data records descend from.

  @class Model
  @namespace DS
  @extends Ember.Object
  @uses Ember.Evented
*/
var Model = Ember.Object.extend(Ember.Evented, {
  _recordArrays: undefined,
  _relationships: undefined,

  store: null,

  /**
    If this property is `true` the record is in the `empty`
    state. Empty is the first state all records enter after they have
    been created. Most records created by the store will quickly
    transition to the `loading` state if data needs to be fetched from
    the server or the `created` state if the record is created on the
    client. A record can also enter the empty state if the adapter is
    unable to locate the record.

    @property isEmpty
    @type {Boolean}
    @readOnly
  */
  isEmpty: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `loading` state. A
    record enters this state when the store asks the adapter for its
    data. It remains in this state until the adapter provides the
    requested data.

    @property isLoading
    @type {Boolean}
    @readOnly
  */
  isLoading: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `loaded` state. A
    record enters this state when its data is populated. Most of a
    record's lifecycle is spent inside substates of the `loaded`
    state.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isLoaded'); // true

    store.find('model', 1).then(function(model) {
      model.get('isLoaded'); // true
    });
    ```

    @property isLoaded
    @type {Boolean}
    @readOnly
  */
  isLoaded: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `dirty` state. The
    record has local changes that have not yet been saved by the
    adapter. This includes records that have been created (but not yet
    saved) or deleted.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isDirty'); // true

    store.find('model', 1).then(function(model) {
      model.get('isDirty'); // false
      model.set('foo', 'some value');
      model.get('isDirty'); // true
    });
    ```

    @property isDirty
    @type {Boolean}
    @readOnly
  */
  isDirty: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `saving` state. A
    record enters the saving state when `save` is called, but the
    adapter has not yet acknowledged that the changes have been
    persisted to the backend.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isSaving'); // false
    var promise = record.save();
    record.get('isSaving'); // true
    promise.then(function() {
      record.get('isSaving'); // false
    });
    ```

    @property isSaving
    @type {Boolean}
    @readOnly
  */
  isSaving: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `deleted` state
    and has been marked for deletion. When `isDeleted` is true and
    `isDirty` is true, the record is deleted locally but the deletion
    was not yet persisted. When `isSaving` is true, the change is
    in-flight. When both `isDirty` and `isSaving` are false, the
    change has persisted.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isDeleted');    // false
    record.deleteRecord();

    // Locally deleted
    record.get('isDeleted');    // true
    record.get('isDirty');      // true
    record.get('isSaving');     // false

    // Persisting the deletion
    var promise = record.save();
    record.get('isDeleted');    // true
    record.get('isSaving');     // true

    // Deletion Persisted
    promise.then(function() {
      record.get('isDeleted');  // true
      record.get('isSaving');   // false
      record.get('isDirty');    // false
    });
    ```

    @property isDeleted
    @type {Boolean}
    @readOnly
  */
  isDeleted: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `new` state. A
    record will be in the `new` state when it has been created on the
    client and the adapter has not yet report that it was successfully
    saved.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('isNew'); // true

    record.save().then(function(model) {
      model.get('isNew'); // false
    });
    ```

    @property isNew
    @type {Boolean}
    @readOnly
  */
  isNew: retrieveFromCurrentState,
  /**
    If this property is `true` the record is in the `valid` state.

    A record will be in the `valid` state when the adapter did not report any
    server-side validation failures.

    @property isValid
    @type {Boolean}
    @readOnly
  */
  isValid: retrieveFromCurrentState,
  /**
    If the record is in the dirty state this property will report what
    kind of change has caused it to move into the dirty
    state. Possible values are:

    - `created` The record has been created by the client and not yet saved to the adapter.
    - `updated` The record has been updated by the client and not yet saved to the adapter.
    - `deleted` The record has been deleted by the client and not yet saved to the adapter.

    Example

    ```javascript
    var record = store.createRecord('model');
    record.get('dirtyType'); // 'created'
    ```

    @property dirtyType
    @type {String}
    @readOnly
  */
  dirtyType: retrieveFromCurrentState,

  /**
    If `true` the adapter reported that it was unable to save local
    changes to the backend for any reason other than a server-side
    validation error.

    Example

    ```javascript
    record.get('isError'); // false
    record.set('foo', 'valid value');
    record.save().then(null, function() {
      record.get('isError'); // true
    });
    ```

    @property isError
    @type {Boolean}
    @readOnly
  */
  isError: false,
  /**
    If `true` the store is attempting to reload the record form the adapter.

    Example

    ```javascript
    record.get('isReloading'); // false
    record.reload();
    record.get('isReloading'); // true
    ```

    @property isReloading
    @type {Boolean}
    @readOnly
  */
  isReloading: false,

  /**
    The `clientId` property is a transient numerical identifier
    generated at runtime by the data store. It is important
    primarily because newly created objects may not yet have an
    externally generated id.

    @property clientId
    @private
    @type {Number|String}
  */
  clientId: null,
  /**
    All ember models have an id property. This is an identifier
    managed by an external source. These are always coerced to be
    strings before being used internally. Note when declaring the
    attributes for a model it is an error to declare an id
    attribute.

    ```javascript
    var record = store.createRecord('model');
    record.get('id'); // null

    store.find('model', 1).then(function(model) {
      model.get('id'); // '1'
    });
    ```

    @property id
    @type {String}
  */
  id: null,

  /**
    @property currentState
    @private
    @type {Object}
  */
  currentState: RootState.empty,

  /**
    When the record is in the `invalid` state this object will contain
    any errors returned by the adapter. When present the errors hash
    contains keys corresponding to the invalid property names
    and values which are arrays of Javascript objects with two keys:

    - `message` A string containing the error message from the backend
    - `attribute` The name of the property associated with this error message

    ```javascript
    record.get('errors.length'); // 0
    record.set('foo', 'invalid value');
    record.save().catch(function() {
      record.get('errors').get('foo');
      // [{message: 'foo should be a number.', attribute: 'foo'}]
    });
    ```

    The `errors` property us useful for displaying error messages to
    the user.

    ```handlebars
    <label>Username: {{input value=username}} </label>
    {{#each error in model.errors.username}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    <label>Email: {{input value=email}} </label>
    {{#each error in model.errors.email}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    ```


    You can also access the special `messages` property on the error
    object to get an array of all the error strings.

    ```handlebars
    {{#each message in model.errors.messages}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property errors
    @type {DS.Errors}
  */
  errors: Ember.computed(function() {
    var errors = Errors.create();

    errors.registerHandlers(this, function() {
      this.send('becameInvalid');
    }, function() {
      this.send('becameValid');
    });

    return errors;
  }).readOnly(),

  /**
    Create a JSON representation of the record, using the serialization
    strategy of the store's adapter.

   `serialize` takes an optional hash as a parameter, currently
    supported options are:

   - `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @method serialize
    @param {Object} options
    @return {Object} an object whose values are primitive JSON values only
  */
  serialize: function(options) {
    return this.store.serialize(this, options);
  },

  /**
    Use [DS.JSONSerializer](DS.JSONSerializer.html) to
    get the JSON representation of a record.

    `toJSON` takes an optional hash as a parameter, currently
    supported options are:

    - `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @method toJSON
    @param {Object} options
    @return {Object} A JSON representation of the object.
  */
  toJSON: function(options) {
    // container is for lazy transform lookups
    var serializer = JSONSerializer.create({ container: this.container });
    var snapshot = this._createSnapshot();

    return serializer.serialize(snapshot, options);
  },

  /**
    Fired when the record is ready to be interacted with,
    that is either loaded from the server or created locally.

    @event ready
  */
  ready: function() {
    this.store.recordArrayManager.recordWasLoaded(this);
  },
  /**
    Fired when the record is loaded from the server.

    @event didLoad
  */
  didLoad: Ember.K,

  /**
    Fired when the record is updated.

    @event didUpdate
  */
  didUpdate: Ember.K,

  /**
    Fired when a new record is commited to the server.

    @event didCreate
  */
  didCreate: Ember.K,

  /**
    Fired when the record is deleted.

    @event didDelete
  */
  didDelete: Ember.K,

  /**
    Fired when the record becomes invalid.

    @event becameInvalid
  */
  becameInvalid: Ember.K,

  /**
    Fired when the record enters the error state.

    @event becameError
  */
  becameError: Ember.K,

  /**
    @property data
    @private
    @type {Object}
  */
  data: Ember.computed(function() {
    this._data = this._data || {};
    return this._data;
  }).readOnly(),

  _data: null,

  init: function() {
    this._super.apply(this, arguments);
    this._setup();
  },

  _setup: function() {
    this._changesToSync = {};
    this._deferredTriggers = [];
    this._data = {};
    this._attributes = Ember.create(null);
    this._inFlightAttributes = Ember.create(null);
    this._relationships = {};
    /*
      implicit relationships are relationship which have not been declared but the inverse side exists on
      another record somewhere
      For example if there was
      ```
        App.Comment = DS.Model.extend({
          name: DS.attr()
        })
      ```
      but there is also
      ```
        App.Post = DS.Model.extend({
          name: DS.attr(),
          comments: DS.hasMany('comment')
        })
      ```

      would have a implicit post relationship in order to be do things like remove ourselves from the post
      when we are deleted
    */
    this._implicitRelationships = Ember.create(null);
    var model = this;
    //TODO Move into a getter for better perf
    this.constructor.eachRelationship(function(key, descriptor) {
      model._relationships[key] = createRelationshipFor(model, descriptor, model.store);
    });

  },

  /**
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send: function(name, context) {
    var currentState = get(this, 'currentState');

    if (!currentState[name]) {
      this._unhandledEvent(currentState, name, context);
    }

    return currentState[name](this, context);
  },

  /**
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo: function(name) {
    // POSSIBLE TODO: Remove this code and replace with
    // always having direct references to state objects

    var pivotName = extractPivotName(name);
    var currentState = get(this, 'currentState');
    var state = currentState;

    do {
      if (state.exit) { state.exit(this); }
      state = state.parentState;
    } while (!state.hasOwnProperty(pivotName));

    var path = splitOnDot(name);
    var setups = [];
    var enters = [];
    var i, l;

    for (i=0, l=path.length; i<l; i++) {
      state = state[path[i]];

      if (state.enter) { enters.push(state); }
      if (state.setup) { setups.push(state); }
    }

    for (i=0, l=enters.length; i<l; i++) {
      enters[i].enter(this);
    }

    set(this, 'currentState', state);

    for (i=0, l=setups.length; i<l; i++) {
      setups[i].setup(this);
    }

    this.updateRecordArraysLater();
  },

  _unhandledEvent: function(state, name, context) {
    var errorMessage = "Attempted to handle event `" + name + "` ";
    errorMessage    += "on " + String(this) + " while in state ";
    errorMessage    += state.stateName + ". ";

    if (context !== undefined) {
      errorMessage  += "Called with " + Ember.inspect(context) + ".";
    }

    throw new Ember.Error(errorMessage);
  },

  withTransaction: function(fn) {
    var transaction = get(this, 'transaction');
    if (transaction) { fn(transaction); }
  },

  /**
    @method loadingData
    @private
    @param {Promise} promise
  */
  loadingData: function(promise) {
    this.send('loadingData', promise);
  },

  /**
    @method loadedData
    @private
  */
  loadedData: function() {
    this.send('loadedData');
  },

  /**
    @method notFound
    @private
  */
  notFound: function() {
    this.send('notFound');
  },

  /**
    @method pushedData
    @private
  */
  pushedData: function() {
    this.send('pushedData');
  },

  /**
    Marks the record as deleted but does not save it. You must call
    `save` afterwards if you want to persist it. You might use this
    method if you want to allow the user to still `rollback()` a
    delete after it was made.

    Example

    ```javascript
    App.ModelDeleteRoute = Ember.Route.extend({
      actions: {
        softDelete: function() {
          this.controller.get('model').deleteRecord();
        },
        confirm: function() {
          this.controller.get('model').save();
        },
        undo: function() {
          this.controller.get('model').rollback();
        }
      }
    });
    ```

    @method deleteRecord
  */
  deleteRecord: function() {
    this.send('deleteRecord');
  },

  /**
    Same as `deleteRecord`, but saves the record immediately.

    Example

    ```javascript
    App.ModelDeleteRoute = Ember.Route.extend({
      actions: {
        delete: function() {
          var controller = this.controller;
          controller.get('model').destroyRecord().then(function() {
            controller.transitionToRoute('model.index');
          });
        }
      }
    });
    ```

    @method destroyRecord
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  destroyRecord: function() {
    this.deleteRecord();
    return this.save();
  },

  /**
    @method unloadRecord
    @private
  */
  unloadRecord: function() {
    if (this.isDestroyed) { return; }

    this.send('unloadRecord');
  },

  /**
    @method clearRelationships
    @private
  */
  clearRelationships: function() {
    this.eachRelationship(function(name, relationship) {
      var rel = this._relationships[name];
      if (rel) {
        //TODO(Igor) figure out whether we want to clear or disconnect
        rel.clear();
        rel.destroy();
      }
    }, this);
    var model = this;
    forEach.call(Ember.keys(this._implicitRelationships), function(key) {
      model._implicitRelationships[key].clear();
      model._implicitRelationships[key].destroy();
    });
  },

  disconnectRelationships: function() {
    this.eachRelationship(function(name, relationship) {
      this._relationships[name].disconnect();
    }, this);
    var model = this;
    forEach.call(Ember.keys(this._implicitRelationships), function(key) {
      model._implicitRelationships[key].disconnect();
    });
  },

  reconnectRelationships: function() {
    this.eachRelationship(function(name, relationship) {
      this._relationships[name].reconnect();
    }, this);
    var model = this;
    forEach.call(Ember.keys(this._implicitRelationships), function(key) {
      model._implicitRelationships[key].reconnect();
    });
  },


  /**
    @method updateRecordArrays
    @private
  */
  updateRecordArrays: function() {
    this._updatingRecordArraysLater = false;
    this.store.dataWasUpdated(this.constructor, this);
  },

  /**
    When a find request is triggered on the store, the user can optionally pass in
    attributes and relationships to be preloaded. These are meant to behave as if they
    came back from the server, except the user obtained them out of band and is informing
    the store of their existence. The most common use case is for supporting client side
    nested URLs, such as `/posts/1/comments/2` so the user can do
    `store.find('comment', 2, {post:1})` without having to fetch the post.

    Preloaded data can be attributes and relationships passed in either as IDs or as actual
    models.

    @method _preloadData
    @private
    @param {Object} preload
  */
  _preloadData: function(preload) {
    var record = this;
    //TODO(Igor) consider the polymorphic case
    forEach.call(Ember.keys(preload), function(key) {
      var preloadValue = get(preload, key);
      var relationshipMeta = record.constructor.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        record._preloadRelationship(key, preloadValue);
      } else {
        get(record, '_data')[key] = preloadValue;
      }
    });
  },

  _preloadRelationship: function(key, preloadValue) {
    var relationshipMeta = this.constructor.metaForProperty(key);
    var type = relationshipMeta.type;
    if (relationshipMeta.kind === 'hasMany') {
      this._preloadHasMany(key, preloadValue, type);
    } else {
      this._preloadBelongsTo(key, preloadValue, type);
    }
  },

  _preloadHasMany: function(key, preloadValue, type) {
    Ember.assert("You need to pass in an array to set a hasMany property on a record", Ember.isArray(preloadValue));
    var record = this;

    var recordsToSet = map.call(preloadValue, function(recordToPush) {
      return record._convertStringOrNumberIntoRecord(recordToPush, type);
    });
    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships[key].updateRecordsFromAdapter(recordsToSet);
  },

  _preloadBelongsTo: function(key, preloadValue, type) {
    var recordToSet = this._convertStringOrNumberIntoRecord(preloadValue, type);

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships[key].setRecord(recordToSet);
  },

  _convertStringOrNumberIntoRecord: function(value, type) {
    if (Ember.typeOf(value) === 'string' || Ember.typeOf(value) === 'number') {
      return this.store.recordForId(type, value);
    }
    return value;
  },

  /**
    @method _notifyProperties
    @private
  */
  _notifyProperties: function(keys) {
    Ember.beginPropertyChanges();
    var key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      this.notifyPropertyChange(key);
    }
    Ember.endPropertyChanges();
  },

  /**
    Returns an object, whose keys are changed properties, and value is
    an [oldProp, newProp] array.

    Example

    ```javascript
    App.Mascot = DS.Model.extend({
      name: attr('string')
    });

    var person = store.createRecord('person');
    person.changedAttributes(); // {}
    person.set('name', 'Tomster');
    person.changedAttributes(); // {name: [undefined, 'Tomster']}
    ```

    @method changedAttributes
    @return {Object} an object, whose keys are changed properties,
      and value is an [oldProp, newProp] array.
  */
  changedAttributes: function() {
    var oldData = get(this, '_data');
    var newData = get(this, '_attributes');
    var diffData = {};
    var prop;

    for (prop in newData) {
      diffData[prop] = [oldData[prop], newData[prop]];
    }

    return diffData;
  },

  /**
    @method adapterWillCommit
    @private
  */
  adapterWillCommit: function() {
    this.send('willCommit');
  },

  /**
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.

    @method adapterDidCommit
  */
  adapterDidCommit: function(data) {
    var changedKeys;
    set(this, 'isError', false);

    if (data) {
      changedKeys = mergeAndReturnChangedKeys(this._data, data);
    } else {
      merge(this._data, this._inFlightAttributes);
    }

    this._inFlightAttributes = Ember.create(null);

    this.send('didCommit');
    this.updateRecordArraysLater();

    if (!data) { return; }

    this._notifyProperties(changedKeys);
  },

  /**
    @method adapterDidDirty
    @private
  */
  adapterDidDirty: function() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  },


  /**
    @method updateRecordArraysLater
    @private
  */
  updateRecordArraysLater: function() {
    // quick hack (something like this could be pushed into run.once
    if (this._updatingRecordArraysLater) { return; }
    this._updatingRecordArraysLater = true;

    Ember.run.schedule('actions', this, this.updateRecordArrays);
  },

  /**
    @method setupData
    @private
    @param {Object} data
  */
  setupData: function(data) {
    Ember.assert("Expected an object as `data` in `setupData`", Ember.typeOf(data) === 'object');

    var changedKeys = mergeAndReturnChangedKeys(this._data, data);

    this.pushedData();

    this._notifyProperties(changedKeys);
  },

  materializeId: function(id) {
    set(this, 'id', id);
  },

  materializeAttributes: function(attributes) {
    Ember.assert("Must pass an object to materializeAttributes", !!attributes);
    merge(this._data, attributes);
  },

  materializeAttribute: function(name, value) {
    this._data[name] = value;
  },

  /**
    If the model `isDirty` this function will discard any unsaved
    changes

    Example

    ```javascript
    record.get('name'); // 'Untitled Document'
    record.set('name', 'Doc 1');
    record.get('name'); // 'Doc 1'
    record.rollback();
    record.get('name'); // 'Untitled Document'
    ```

    @method rollback
  */
  rollback: function() {
    var dirtyKeys = Ember.keys(this._attributes);

    this._attributes = Ember.create(null);

    if (get(this, 'isError')) {
      this._inFlightAttributes = Ember.create(null);
      set(this, 'isError', false);
    }

    //Eventually rollback will always work for relationships
    //For now we support it only out of deleted state, because we
    //have an explicit way of knowing when the server acked the relationship change
    if (get(this, 'isDeleted')) {
      this.reconnectRelationships();
    }

    if (get(this, 'isNew')) {
      this.clearRelationships();
    }

    if (!get(this, 'isValid')) {
      this._inFlightAttributes = Ember.create(null);
    }

    this.send('rolledBack');

    this._notifyProperties(dirtyKeys);
  },

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot: function() {
    return new Snapshot(this);
  },

  toStringExtension: function() {
    return get(this, 'id');
  },

  /**
    Save the record and persist any changes to the record to an
    external source via the adapter.

    Example

    ```javascript
    record.set('name', 'Tomster');
    record.save().then(function() {
      // Success callback
    }, function() {
      // Error callback
    });
    ```
    @method save
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  save: function() {
    var promiseLabel = "DS: Model#save " + this;
    var resolver = Ember.RSVP.defer(promiseLabel);

    this.store.scheduleSave(this, resolver);
    this._inFlightAttributes = this._attributes;
    this._attributes = Ember.create(null);

    return PromiseObject.create({
      promise: resolver.promise
    });
  },

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading
    and has not yet been modified (`isLoaded` but not `isDirty`,
    or `isSaving`).

    Example

    ```javascript
    App.ModelViewRoute = Ember.Route.extend({
      actions: {
        reload: function() {
          this.controller.get('model').reload().then(function(model) {
            // do something with the reloaded model
          });
        }
      }
    });
    ```

    @method reload
    @return {Promise} a promise that will be resolved with the record when the
    adapter returns successfully or rejected if the adapter returns
    with an error.
  */
  reload: function() {
    set(this, 'isReloading', true);

    var record = this;
    var promiseLabel = "DS: Model#reload of " + this;
    var promise = new Promise(function(resolve) {
      record.send('reloadRecord', resolve);
    }, promiseLabel).then(function() {
      record.set('isReloading', false);
      record.set('isError', false);
      return record;
    }, function(reason) {
      record.set('isError', true);
      throw reason;
    }, "DS: Model#reload complete, update flags")['finally'](function () {
      record.updateRecordArrays();
    });

    return PromiseObject.create({
      promise: promise
    });
  },

  // FOR USE DURING COMMIT PROCESS

  /**
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate: function(errors) {
    var recordErrors = get(this, 'errors');
    for (var key in errors) {
      if (!errors.hasOwnProperty(key)) {
        continue;
      }
      recordErrors.add(key, errors[key]);
    }
    this._saveWasRejected();
  },

  /**
    @method adapterDidError
    @private
  */
  adapterDidError: function() {
    this.send('becameError');
    set(this, 'isError', true);
    this._saveWasRejected();
  },

  _saveWasRejected: function() {
    var keys = Ember.keys(this._inFlightAttributes);
    for (var i=0; i < keys.length; i++) {
      if (this._attributes[keys[i]] === undefined) {
        this._attributes[keys[i]] = this._inFlightAttributes[keys[i]];
      }
    }
    this._inFlightAttributes = Ember.create(null);
  },

  /**
    Override the default event firing from Ember.Evented to
    also call methods with the given name.

    @method trigger
    @private
    @param {String} name
  */
  trigger: function() {
    var length = arguments.length;
    var args = new Array(length - 1);
    var name = arguments[0];

    for (var i = 1; i < length; i++) {
      args[i - 1] = arguments[i];
    }

    Ember.tryInvoke(this, name, args);
    this._super.apply(this, arguments);
  },

  triggerLater: function() {
    var length = arguments.length;
    var args = new Array(length);

    for (var i = 0; i < length; i++) {
      args[i] = arguments[i];
    }

    if (this._deferredTriggers.push(args) !== 1) {
      return;
    }
    Ember.run.schedule('actions', this, '_triggerDeferredTriggers');
  },

  _triggerDeferredTriggers: function() {
    for (var i=0, l= this._deferredTriggers.length; i<l; i++) {
      this.trigger.apply(this, this._deferredTriggers[i]);
    }

    this._deferredTriggers.length = 0;
  },

  willDestroy: function() {
    this._super.apply(this, arguments);
    this.clearRelationships();
  },

  // This is a temporary solution until we refactor DS.Model to not
  // rely on the data property.
  willMergeMixin: function(props) {
    var constructor = this.constructor;
    [
      'attributes', 'clientId', 'currentState', 'data', 'dirtyType',
      'errors', 'fields', 'isDeleted', 'isDirty', 'isDestroyed',
      'isDestroying', 'isEmpty', 'isError', 'isLoaded',
      'isLoading', 'isNew', 'isReloading', 'isSaving', 'isValid',
      'relatedTypes', 'relationshipNames', 'relationships',
      'relationshipsByName', 'transformedAttributes', 'store'
    ].forEach(function(reservedProperty) {
      Ember.assert('`' + reservedProperty + '` is a reserved property name on DS.Model objects. Please choose a different property name for ' + constructor.toString(), !props[reservedProperty]);
    });
  },

  attr: function() {
    Ember.assert("The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
  },

  belongsTo: function() {
    Ember.assert("The `belongsTo` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
  },

  hasMany: function() {
    Ember.assert("The `hasMany` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
  }
});

Model.reopenClass({
  /**
    Alias DS.Model's `create` method to `_create`. This allows us to create DS.Model
    instances from within the store, but if end users accidentally call `create()`
    (instead of `createRecord()`), we can raise an error.

    @method _create
    @private
    @static
  */
  _create: Model.create,

  /**
    Override the class' `create()` method to raise an error. This
    prevents end users from inadvertently calling `create()` instead
    of `createRecord()`. The store is still able to create instances
    by calling the `_create()` method. To create an instance of a
    `DS.Model` use [store.createRecord](DS.Store.html#method_createRecord).

    @method create
    @private
    @static
  */
  create: function() {
    throw new Ember.Error("You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.");
  }
});

export default Model;
