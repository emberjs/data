import RootState from "./states";
import Errors from "./errors";
import { PromiseObject } from "../store";
/**
  @module ember-data
*/

var get = Ember.get;
var set = Ember.set;
var merge = Ember.merge;
var Promise = Ember.RSVP.Promise;

var JSONSerializer;
var retrieveFromCurrentState = Ember.computed('currentState', function(key, value) {
  return get(get(this, 'currentState'), key);
}).readOnly();

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
  _loadingRecordArrays: undefined,
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
    typically contains keys corresponding to the invalid property names
    and values which are an array of error messages.

    ```javascript
    record.get('errors.length'); // 0
    record.set('foo', 'invalid value');
    record.save().then(null, function() {
      record.get('errors').get('foo'); // ['foo should be a number.']
    });
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
    var store = get(this, 'store');
    return store.serialize(this, options);
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
    if (!JSONSerializer) { JSONSerializer = requireModule("ember-data/lib/serializers/json_serializer")["default"]; }
    // container is for lazy transform lookups
    var serializer = JSONSerializer.create({ container: this.container });
    return serializer.serialize(this, options);
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
    Fired when the record is created.

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
    this._super();
    this._setup();
  },

  _setup: function() {
    this._changesToSync = {};
    this._deferredTriggers = [];
    this._data = {};
    this._attributes = {};
    this._inFlightAttributes = {};
    this._relationships = {};
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

    var pivotName = name.split(".", 1),
        currentState = get(this, 'currentState'),
        state = currentState;

    do {
      if (state.exit) { state.exit(this); }
      state = state.parentState;
    } while (!state.hasOwnProperty(pivotName));

    var path = name.split(".");

    var setups = [], enters = [], i, l;

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
      if (relationship.kind === 'belongsTo') {
        set(this, name, null);
      } else if (relationship.kind === 'hasMany') {
        var hasMany = this._relationships[name];
        if (hasMany) { // relationships are created lazily
          hasMany.destroy();
        }
      }
    }, this);
  },

  /**
    @method updateRecordArrays
    @private
  */
  updateRecordArrays: function() {
    this._updatingRecordArraysLater = false;
    get(this, 'store').dataWasUpdated(this.constructor, this);
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
    var oldData = get(this, '_data'),
        newData = get(this, '_attributes'),
        diffData = {},
        prop;

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
    set(this, 'isError', false);

    if (data) {
      this._data = data;
    } else {
      Ember.mixin(this._data, this._inFlightAttributes);
    }

    this._inFlightAttributes = {};

    this.send('didCommit');
    this.updateRecordArraysLater();

    if (!data) { return; }

    this.suspendRelationshipObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  /**
    @method adapterDidDirty
    @private
  */
  adapterDidDirty: function() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  },

  dataDidChange: Ember.observer(function() {
    this.reloadHasManys();
  }, 'data'),

  reloadHasManys: function() {
    var relationships = get(this.constructor, 'relationshipsByName');
    this.updateRecordArraysLater();
    relationships.forEach(function(name, relationship) {
      if (this._data.links && this._data.links[name]) { return; }
      if (relationship.kind === 'hasMany') {
        this.hasManyDidChange(relationship.key);
      }
    }, this);
  },

  hasManyDidChange: function(key) {
    var hasMany = this._relationships[key];

    if (hasMany) {
      var records = this._data[key] || [];

      set(hasMany, 'content', Ember.A(records));
      set(hasMany, 'isLoaded', true);
      hasMany.trigger('didLoad');
    }
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
    @param {Boolean} partial the data should be merged into
      the existing data, not replace it.
  */
  setupData: function(data, partial) {
    if (partial) {
      Ember.merge(this._data, data);
    } else {
      this._data = data;
    }

    var relationships = this._relationships;

    this.eachRelationship(function(name, rel) {
      if (data.links && data.links[name]) { return; }
      if (rel.options.async) { relationships[name] = null; }
    });

    if (data) { this.pushedData(); }

    this.suspendRelationshipObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  materializeId: function(id) {
    set(this, 'id', id);
  },

  materializeAttributes: function(attributes) {
    Ember.assert("Must pass a hash of attributes to materializeAttributes", !!attributes);
    merge(this._data, attributes);
  },

  materializeAttribute: function(name, value) {
    this._data[name] = value;
  },

  /**
    @method updateHasMany
    @private
    @param {String} name
    @param {Array} records
  */
  updateHasMany: function(name, records) {
    this._data[name] = records;
    this.hasManyDidChange(name);
  },

  /**
    @method updateBelongsTo
    @private
    @param {String} name
    @param {DS.Model} record
  */
  updateBelongsTo: function(name, record) {
    this._data[name] = record;
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
    this._attributes = {};

    if (get(this, 'isError')) {
      this._inFlightAttributes = {};
      set(this, 'isError', false);
    }

    if (!get(this, 'isValid')) {
      this._inFlightAttributes = {};
    }

    this.send('rolledBack');

    this.suspendRelationshipObservers(function() {
      this.notifyPropertyChange('data');
    });
  },

  toStringExtension: function() {
    return get(this, 'id');
  },

  /**
    The goal of this method is to temporarily disable specific observers
    that take action in response to application changes.

    This allows the system to make changes (such as materialization and
    rollback) that should not trigger secondary behavior (such as setting an
    inverse relationship or marking records as dirty).

    The specific implementation will likely change as Ember proper provides
    better infrastructure for suspending groups of observers, and if Array
    observation becomes more unified with regular observers.

    @method suspendRelationshipObservers
    @private
    @param callback
    @param binding
  */
  suspendRelationshipObservers: function(callback, binding) {
    var observers = get(this.constructor, 'relationshipNames').belongsTo;
    var self = this;

    try {
      this._suspendedRelationships = true;
      Ember._suspendObservers(self, observers, null, 'belongsToDidChange', function() {
        Ember._suspendBeforeObservers(self, observers, null, 'belongsToWillChange', function() {
          callback.call(binding || self);
        });
      });
    } finally {
      this._suspendedRelationships = false;
    }
  },

  /**
    Save the record and persist any changes to the record to an
    extenal source via the adapter.

    Example

    ```javascript
    record.set('name', 'Tomster');
    record.save().then(function(){
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

    this.get('store').scheduleSave(this, resolver);
    this._inFlightAttributes = this._attributes;
    this._attributes = {};

    return PromiseObject.create({ promise: resolver.promise });
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
          this.controller.get('model').reload();
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

    var  record = this;

    var promiseLabel = "DS: Model#reload of " + this;
    var promise = new Promise(function(resolve){
       record.send('reloadRecord', resolve);
    }, promiseLabel).then(function() {
      record.set('isReloading', false);
      record.set('isError', false);
      return record;
    }, function(reason) {
      record.set('isError', true);
      throw reason;
    }, "DS: Model#reload complete, update flags");

    return PromiseObject.create({ promise: promise });
  },

  // FOR USE DURING COMMIT PROCESS

  adapterDidUpdateAttribute: function(attributeName, value) {

    // If a value is passed in, update the internal attributes and clear
    // the attribute cache so it picks up the new value. Otherwise,
    // collapse the current value into the internal attributes because
    // the adapter has acknowledged it.
    if (value !== undefined) {
      this._data[attributeName] = value;
      this.notifyPropertyChange(attributeName);
    } else {
      this._data[attributeName] = this._inFlightAttributes[attributeName];
    }

    this.updateRecordArraysLater();
  },

  /**
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate: function(errors) {
    var recordErrors = get(this, 'errors');
    function addError(name) {
      if (errors[name]) {
        recordErrors.add(name, errors[name]);
      }
    }

    this.eachAttribute(addError);
    this.eachRelationship(addError);
  },

  /**
    @method adapterDidError
    @private
  */
  adapterDidError: function() {
    this.send('becameError');
    set(this, 'isError', true);
  },

  /**
    Override the default event firing from Ember.Evented to
    also call methods with the given name.

    @method trigger
    @private
    @param name
  */
  trigger: function(name) {
    Ember.tryInvoke(this, name, [].slice.call(arguments, 1));
    this._super.apply(this, arguments);
  },

  triggerLater: function() {
    if (this._deferredTriggers.push(arguments) !== 1) { return; }
    Ember.run.schedule('actions', this, '_triggerDeferredTriggers');
  },

  _triggerDeferredTriggers: function() {
    for (var i=0, l=this._deferredTriggers.length; i<l; i++) {
      this.trigger.apply(this, this._deferredTriggers[i]);
    }

    this._deferredTriggers.length = 0;
  },

  willDestroy: function() {
    this._super();
    this.clearRelationships();
  },

  // This is a temporary solution until we refactor DS.Model to not
  // rely on the data property.
  willMergeMixin: function(props) {
    Ember.assert('`data` is a reserved property name on DS.Model objects. Please choose a different property name for ' + this.constructor.toString(), !props.data);
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
