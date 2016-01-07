import Ember from 'ember';
import { assert } from "ember-data/-private/debug";
import merge from "ember-data/-private/system/merge";
import RootState from "ember-data/-private/system/model/states";
import Relationships from "ember-data/-private/system/relationships/state/create";
import Snapshot from "ember-data/-private/system/snapshot";
import EmptyObject from "ember-data/-private/system/empty-object";

import {
  getOwner
} from 'ember-data/-private/utils';

var Promise = Ember.RSVP.Promise;
var get = Ember.get;
var set = Ember.set;
var copy = Ember.copy;

var _extractPivotNameCache = new EmptyObject();
var _splitOnDotCache = new EmptyObject();

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

function retrieveFromCurrentState(key) {
  return function() {
    return get(this.currentState, key);
  };
}

var guid = 0;
/*
  `InternalModel` is the Model class that we use internally inside Ember Data to represent models.
  Internal ED methods should only deal with `InternalModel` objects. It is a fast, plain Javascript class.

  We expose `DS.Model` to application code, by materializing a `DS.Model` from `InternalModel` lazily, as
  a performance optimization.

  `InternalModel` should never be exposed to application code. At the boundaries of the system, in places
  like `find`, `push`, etc. we convert between Models and InternalModels.

  We need to make sure that the properties from `InternalModel` are correctly exposed/proxied on `Model`
  if they are needed.

  @private
  @class InternalModel
*/

export default function InternalModel(type, id, store, _, data) {
  this.type = type;
  this.id = id;
  this.store = store;
  this._data = data || new EmptyObject();
  this.modelName = type.modelName;
  this.dataHasInitialized = false;
  //Look into making this lazy
  this._deferredTriggers = [];
  this._attributes = new EmptyObject();
  this._inFlightAttributes = new EmptyObject();
  this._relationships = new Relationships(this);
  this._recordArrays = undefined;
  this.currentState = RootState.empty;
  this.isReloading = false;
  this.isError = false;
  this.error = null;
  this.__ember_meta__ = null;
  this[Ember.GUID_KEY] = guid++ + 'internal-model';
  /*
    implicit relationships are relationship which have not been declared but the inverse side exists on
    another record somewhere
    For example if there was

    ```app/models/comment.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      name: DS.attr()
    })
    ```

    but there is also

    ```app/models/post.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      name: DS.attr(),
      comments: DS.hasMany('comment')
    })
    ```

    would have a implicit post relationship in order to be do things like remove ourselves from the post
    when we are deleted
  */
  this._implicitRelationships = new EmptyObject();
}

InternalModel.prototype = {
  isEmpty: retrieveFromCurrentState('isEmpty'),
  isLoading: retrieveFromCurrentState('isLoading'),
  isLoaded: retrieveFromCurrentState('isLoaded'),
  hasDirtyAttributes: retrieveFromCurrentState('hasDirtyAttributes'),
  isSaving: retrieveFromCurrentState('isSaving'),
  isDeleted: retrieveFromCurrentState('isDeleted'),
  isNew: retrieveFromCurrentState('isNew'),
  isValid: retrieveFromCurrentState('isValid'),
  dirtyType: retrieveFromCurrentState('dirtyType'),

  constructor: InternalModel,
  materializeRecord: function() {
    assert("Materialized " + this.modelName + " record with id:" + this.id + "more than once", this.record === null || this.record === undefined);

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    var createOptions = {
      store: this.store,
      _internalModel: this,
      id: this.id,
      currentState: get(this, 'currentState'),
      isError: this.isError,
      adapterError: this.error
    };

    if (Ember.setOwner) {
      // ensure that `Ember.getOwner(this)` works inside a model instance
      Ember.setOwner(createOptions, getOwner(this.store));
    } else {
      createOptions.container = this.store.container;
    }

    this.record = this.type._create(createOptions);

    this._triggerDeferredTriggers();
  },

  recordObjectWillDestroy: function() {
    this.record = null;
  },

  deleteRecord: function() {
    this.send('deleteRecord');
  },

  save: function(options) {
    var promiseLabel = "DS: Model#save " + this;
    var resolver = Ember.RSVP.defer(promiseLabel);

    this.store.scheduleSave(this, resolver, options);
    return resolver.promise;
  },

  startedReloading: function() {
    this.isReloading = true;
    if (this.record) {
      set(this.record, 'isReloading', true);
    }
  },

  finishedReloading: function() {
    this.isReloading = false;
    if (this.record) {
      set(this.record, 'isReloading', false);
    }
  },

  reload: function() {
    this.startedReloading();
    var record = this;
    var promiseLabel = "DS: Model#reload of " + this;
    return new Promise(function(resolve) {
      record.send('reloadRecord', resolve);
    }, promiseLabel).then(function() {
      record.didCleanError();
      return record;
    }, function(error) {
      record.didError(error);
      throw error;
    }, "DS: Model#reload complete, update flags").finally(function () {
      record.finishedReloading();
      record.updateRecordArrays();
    });
  },

  getRecord: function() {
    if (!this.record) {
      this.materializeRecord();
    }
    return this.record;
  },

  unloadRecord: function() {
    this.send('unloadRecord');
  },

  eachRelationship: function(callback, binding) {
    return this.type.eachRelationship(callback, binding);
  },

  eachAttribute: function(callback, binding) {
    return this.type.eachAttribute(callback, binding);
  },

  inverseFor: function(key) {
    return this.type.inverseFor(key);
  },

  setupData: function(data) {
    var changedKeys = this._changedKeys(data.attributes);
    merge(this._data, data.attributes);
    this.pushedData();
    if (this.record) {
      this.record._notifyProperties(changedKeys);
    }
    this.didInitalizeData();
  },

  becameReady: function() {
    Ember.run.schedule('actions', this.store.recordArrayManager, this.store.recordArrayManager.recordWasLoaded, this);
  },

  didInitalizeData: function() {
    if (!this.dataHasInitialized) {
      this.becameReady();
      this.dataHasInitialized = true;
    }
  },

  destroy: function() {
    if (this.record) {
      return this.record.destroy();
    }
  },

  /*
    @method createSnapshot
    @private
  */
  createSnapshot: function(options) {
    var adapterOptions = options && options.adapterOptions;
    var snapshot = new Snapshot(this);
    snapshot.adapterOptions = adapterOptions;
    return snapshot;
  },

  /*
    @method loadingData
    @private
    @param {Promise} promise
  */
  loadingData: function(promise) {
    this.send('loadingData', promise);
  },

  /*
    @method loadedData
    @private
  */
  loadedData: function() {
    this.send('loadedData');
    this.didInitalizeData();
  },

  /*
    @method notFound
    @private
  */
  notFound: function() {
    this.send('notFound');
  },

  /*
    @method pushedData
    @private
  */
  pushedData: function() {
    this.send('pushedData');
  },

  flushChangedAttributes: function() {
    this._inFlightAttributes = this._attributes;
    this._attributes = new EmptyObject();
  },

  hasChangedAttributes: function() {
    return Object.keys(this._attributes).length > 0;
  },

  /*
    Checks if the attributes which are considered as changed are still
    different to the state which is acknowledged by the server.

    This method is needed when data for the internal model is pushed and the
    pushed data might acknowledge dirty attributes as confirmed.

    @private
   */
  updateChangedAttributes: function() {
    var changedAttributes = this.changedAttributes();
    var changedAttributeNames = Object.keys(changedAttributes);

    for (let i = 0, length = changedAttributeNames.length; i < length; i++) {
      let attribute = changedAttributeNames[i];
      let [oldData, newData] = changedAttributes[attribute];

      if (oldData === newData) {
        delete this._attributes[attribute];
      }
    }
  },

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @private
  */
  changedAttributes: function() {
    var oldData = this._data;
    var currentData = this._attributes;
    var inFlightData = this._inFlightAttributes;
    var newData = merge(copy(inFlightData), currentData);
    var diffData = new EmptyObject();

    var newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      diffData[key] = [oldData[key], newData[key]];
    }

    return diffData;
  },

  /*
    @method adapterWillCommit
    @private
  */
  adapterWillCommit: function() {
    this.send('willCommit');
  },

  /*
    @method adapterDidDirty
    @private
  */
  adapterDidDirty: function() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  },

  /*
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

  notifyHasManyAdded: function(key, record, idx) {
    if (this.record) {
      this.record.notifyHasManyAdded(key, record, idx);
    }
  },

  notifyHasManyRemoved: function(key, record, idx) {
    if (this.record) {
      this.record.notifyHasManyRemoved(key, record, idx);
    }
  },

  notifyBelongsToChanged: function(key, record) {
    if (this.record) {
      this.record.notifyBelongsToChanged(key, record);
    }
  },

  notifyPropertyChange: function(key) {
    if (this.record) {
      this.record.notifyPropertyChange(key);
    }
  },

  rollbackAttributes: function() {
    var dirtyKeys = Object.keys(this._attributes);

    this._attributes = new EmptyObject();

    if (get(this, 'isError')) {
      this._inFlightAttributes = new EmptyObject();
      this.didCleanError();
    }

    //Eventually rollback will always work for relationships
    //For now we support it only out of deleted state, because we
    //have an explicit way of knowing when the server acked the relationship change
    if (this.isDeleted()) {
      //TODO: Should probably move this to the state machine somehow
      this.becameReady();
    }

    if (this.isNew()) {
      this.clearRelationships();
    }

    if (this.isValid()) {
      this._inFlightAttributes = new EmptyObject();
    }

    this.send('rolledBack');

    this.record._notifyProperties(dirtyKeys);

  },
  /*
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo: function(name) {
    // POSSIBLE TODO: Remove this code and replace with
    // always having direct reference to state objects

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
    //TODO Consider whether this is the best approach for keeping these two in sync
    if (this.record) {
      set(this.record, 'currentState', state);
    }

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

  triggerLater: function() {
    var length = arguments.length;
    var args = new Array(length);

    for (var i = 0; i < length; i++) {
      args[i] = arguments[i];
    }

    if (this._deferredTriggers.push(args) !== 1) {
      return;
    }
    Ember.run.scheduleOnce('actions', this, '_triggerDeferredTriggers');
  },

  _triggerDeferredTriggers: function() {
    //TODO: Before 1.0 we want to remove all the events that happen on the pre materialized record,
    //but for now, we queue up all the events triggered before the record was materialized, and flush
    //them once we have the record
    if (!this.record) {
      return;
    }
    for (var i=0, l= this._deferredTriggers.length; i<l; i++) {
      this.record.trigger.apply(this.record, this._deferredTriggers[i]);
    }

    this._deferredTriggers.length = 0;
  },
  /*
    @method clearRelationships
    @private
  */
  clearRelationships: function() {
    this.eachRelationship((name, relationship) => {
      if (this._relationships.has(name)) {
        var rel = this._relationships.get(name);
        rel.clear();
        rel.destroy();
      }
    });
    Object.keys(this._implicitRelationships).forEach((key) => {
      this._implicitRelationships[key].clear();
      this._implicitRelationships[key].destroy();
    });
  },

  /*
    When a find request is triggered on the store, the user can optionally pass in
    attributes and relationships to be preloaded. These are meant to behave as if they
    came back from the server, except the user obtained them out of band and is informing
    the store of their existence. The most common use case is for supporting client side
    nested URLs, such as `/posts/1/comments/2` so the user can do
    `store.findRecord('comment', 2, { preload: { post: 1 } })` without having to fetch the post.

    Preloaded data can be attributes and relationships passed in either as IDs or as actual
    models.

    @method _preloadData
    @private
    @param {Object} preload
  */
  _preloadData: function(preload) {
    //TODO(Igor) consider the polymorphic case
    Object.keys(preload).forEach((key) => {
      var preloadValue = get(preload, key);
      var relationshipMeta = this.type.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        this._preloadRelationship(key, preloadValue);
      } else {
        this._data[key] = preloadValue;
      }
    });
  },

  _preloadRelationship: function(key, preloadValue) {
    var relationshipMeta = this.type.metaForProperty(key);
    var type = relationshipMeta.type;
    if (relationshipMeta.kind === 'hasMany') {
      this._preloadHasMany(key, preloadValue, type);
    } else {
      this._preloadBelongsTo(key, preloadValue, type);
    }
  },

  _preloadHasMany: function(key, preloadValue, type) {
    assert("You need to pass in an array to set a hasMany property on a record", Ember.isArray(preloadValue));
    var internalModel = this;

    var recordsToSet = preloadValue.map((recordToPush) => {
      return internalModel._convertStringOrNumberIntoInternalModel(recordToPush, type);
    });
    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).updateRecordsFromAdapter(recordsToSet);
  },

  _preloadBelongsTo: function(key, preloadValue, type) {
    var recordToSet = this._convertStringOrNumberIntoInternalModel(preloadValue, type);

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).setRecord(recordToSet);
  },

  _convertStringOrNumberIntoInternalModel: function(value, type) {
    if (typeof value === 'string' || typeof value === 'number') {
      return this.store._internalModelForId(type, value);
    }
    if (value._internalModel) {
      return value._internalModel;
    }
    return value;
  },

  /*
    @method updateRecordArrays
    @private
  */
  updateRecordArrays: function() {
    this._updatingRecordArraysLater = false;
    this.store.dataWasUpdated(this.type, this);
  },

  setId: function(id) {
    assert('A record\'s id cannot be changed once it is in the loaded state', this.id === null || this.id === id || this.isNew());
    this.id = id;
    if (this.record.get('id') !== id) {
      this.record.set('id', id);
    }
  },

  didError: function(error) {
    this.error = error;
    this.isError = true;

    if (this.record) {
      this.record.setProperties({
        isError: true,
        adapterError: error
      });
    }
  },

  didCleanError: function() {
    this.error = null;
    this.isError = false;

    if (this.record) {
      this.record.setProperties({
        isError: false,
        adapterError: null
      });
    }
  },
  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.

    @method adapterDidCommit
  */
  adapterDidCommit: function(data) {
    if (data) {
      data = data.attributes;
    }

    this.didCleanError();
    var changedKeys = this._changedKeys(data);

    merge(this._data, this._inFlightAttributes);
    if (data) {
      merge(this._data, data);
    }

    this._inFlightAttributes = new EmptyObject();

    this.send('didCommit');
    this.updateRecordArraysLater();

    if (!data) { return; }

    this.record._notifyProperties(changedKeys);
  },

  /*
    @method updateRecordArraysLater
    @private
  */
  updateRecordArraysLater: function() {
    // quick hack (something like this could be pushed into run.once
    if (this._updatingRecordArraysLater) { return; }
    this._updatingRecordArraysLater = true;
    Ember.run.schedule('actions', this, this.updateRecordArrays);
  },

  addErrorMessageToAttribute: function(attribute, message) {
    var record = this.getRecord();
    get(record, 'errors').add(attribute, message);
  },

  removeErrorMessageFromAttribute: function(attribute) {
    var record = this.getRecord();
    get(record, 'errors').remove(attribute);
  },

  clearErrorMessages: function() {
    var record = this.getRecord();
    get(record, 'errors').clear();
  },

  // FOR USE DURING COMMIT PROCESS

  /*
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate: function(errors) {
    var attribute;

    for (attribute in errors) {
      if (errors.hasOwnProperty(attribute)) {
        this.addErrorMessageToAttribute(attribute, errors[attribute]);
      }
    }

    this.send('becameInvalid');

    this._saveWasRejected();
  },

  /*
    @method adapterDidError
    @private
  */
  adapterDidError: function(error) {
    this.send('becameError');
    this.didError(error);
    this._saveWasRejected();
  },

  _saveWasRejected: function() {
    var keys = Object.keys(this._inFlightAttributes);
    for (var i=0; i < keys.length; i++) {
      if (this._attributes[keys[i]] === undefined) {
        this._attributes[keys[i]] = this._inFlightAttributes[keys[i]];
      }
    }
    this._inFlightAttributes = new EmptyObject();
  },

  /*
    Ember Data has 3 buckets for storing the value of an attribute on an internalModel.

    `_data` holds all of the attributes that have been acknowledged by
    a backend via the adapter. When rollbackAttributes is called on a model all
    attributes will revert to the record's state in `_data`.

    `_attributes` holds any change the user has made to an attribute
    that has not been acknowledged by the adapter. Any values in
    `_attributes` are have priority over values in `_data`.

    `_inFlightAttributes`. When a record is being synced with the
    backend the values in `_attributes` are copied to
    `_inFlightAttributes`. This way if the backend acknowledges the
    save but does not return the new state Ember Data can copy the
    values from `_inFlightAttributes` to `_data`. Without having to
    worry about changes made to `_attributes` while the save was
    happenign.


    Changed keys builds a list of all of the values that may have been
    changed by the backend after a successful save.

    It does this by iterating over each key, value pair in the payload
    returned from the server after a save. If the `key` is found in
    `_attributes` then the user has a local changed to the attribute
    that has not been synced with the server and the key is not
    included in the list of changed keys.



    If the value, for a key differs from the value in what Ember Data
    believes to be the truth about the backend state (A merger of the
    `_data` and `_inFlightAttributes` objects where
    `_inFlightAttributes` has priority) then that means the backend
    has updated the value and the key is added to the list of changed
    keys.

    @method _changedKeys
    @private
  */
  _changedKeys: function(updates) {
    var changedKeys = [];

    if (updates) {
      var original, i, value, key;
      var keys = Object.keys(updates);
      var length = keys.length;

      original = merge(new EmptyObject(), this._data);
      original = merge(original, this._inFlightAttributes);

      for (i = 0; i < length; i++) {
        key = keys[i];
        value = updates[key];

        // A value in _attributes means the user has a local change to
        // this attributes. We never override this value when merging
        // updates from the backend so we should not sent a change
        // notification if the server value differs from the original.
        if (this._attributes[key] !== undefined) {
          continue;
        }

        if (!Ember.isEqual(original[key], value)) {
          changedKeys.push(key);
        }
      }
    }

    return changedKeys;
  },

  toString: function() {
    if (this.record) {
      return this.record.toString();
    } else {
      return `<${this.modelName}:${this.id}>`;
    }
  }
};
