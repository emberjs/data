import merge from "ember-data/system/merge";
import RootState from "ember-data/system/model/states";
import createRelationshipFor from "ember-data/system/relationships/state/create";
import Snapshot from "ember-data/system/snapshot";
import Errors from "ember-data/system/model/errors";

var Promise = Ember.RSVP.Promise;
var get = Ember.get;
var set = Ember.set;
var forEach = Ember.ArrayPolyfills.forEach;
var map = Ember.ArrayPolyfills.map;

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

function retrieveFromCurrentState(key) {
  return function() {
    return get(this.currentState, key);
  };
}

/**
  `InternalModel` is the Model class that we use internally inside Ember Data to represent models.
  Internal ED methods should only deal with `InternalModel` objects. It is a fast, plain Javascript class.

  We expose `DS.Model` to application code, by materializing a `DS.Model` from `InternalModel` lazily, as
  a performance optimization.

  `InternalModel` should never be exposed to application code. At the boundaries of the system, in places
  like `find`, `push`, etc. we convert between Models and InternalModels.

  We need to make sure that the properties from `InternalModel` are correctly exposed/proxied on `Model`
  if they are needed.

  @class InternalModel
*/

var InternalModel = function InternalModel(type, id, store, container, data) {
  this.type = type;
  this.id = id;
  this.store = store;
  this.container = container;
  this._data = data || Ember.create(null);
  this.modelName = type.modelName;
  this.errors = null;
  this.dataHasInitialized = false;
  //Look into making this lazy
  this._deferredTriggers = [];
  this._attributes = Ember.create(null);
  this._inFlightAttributes = Ember.create(null);
  this._relationships = Ember.create(null);
  this.currentState = RootState.empty;
  this.isReloading = false;
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
  this.eachRelationship(function(key, descriptor) {
    model._relationships[key] = createRelationshipFor(model, descriptor, model.store);
  });
};

InternalModel.prototype = {
  isEmpty: retrieveFromCurrentState('isEmpty'),
  isLoading: retrieveFromCurrentState('isLoading'),
  isLoaded: retrieveFromCurrentState('isLoaded'),
  isDirty: retrieveFromCurrentState('isDirty'),
  isSaving: retrieveFromCurrentState('isSaving'),
  isDeleted: retrieveFromCurrentState('isDeleted'),
  isNew: retrieveFromCurrentState('isNew'),
  isValid: retrieveFromCurrentState('isValid'),
  dirtyType: retrieveFromCurrentState('dirtyType'),

  constructor: InternalModel,
  materializeRecord() {
    Ember.assert("Materialized " + this.modelName + " record with id:" + this.id + "more than once", this.record === null || this.record === undefined);
    // lookupFactory should really return an object that creates
    // instances with the injections applied
    this.record = this.type._create({
      id: this.id,
      store: this.store,
      container: this.container
    });
    this.record._internalModel = this;
    this._triggerDeferredTriggers();
  },

  recordObjectWillDestroy() {
    this.record = null;
  },

  deleteRecord() {
    this.send('deleteRecord');
  },

  save() {
    var promiseLabel = "DS: Model#save " + this;
    var resolver = Ember.RSVP.defer(promiseLabel);

    this.store.scheduleSave(this, resolver);
    return resolver.promise;
  },

  startedReloading() {
    this.isReloading = true;
    if (this.record) {
      set(this.record, 'isReloading', true);
    }
  },

  finishedReloading() {
    this.isReloading = false;
    if (this.record) {
      set(this.record, 'isReloading', false);
    }
  },

  reload() {
    this.startedReloading();
    var record = this;
    var promiseLabel = "DS: Model#reload of " + this;
    return new Promise(function(resolve) {
      record.send('reloadRecord', resolve);
    }, promiseLabel).then(function() {
      record.didCleanError();
      return record;
    }, function(reason) {
      record.didError();
      throw reason;
    }, "DS: Model#reload complete, update flags").finally(function () {
      record.finishedReloading();
      record.updateRecordArrays();
    });
  },

  getRecord() {
    if (!this.record) {
      this.materializeRecord();
    }
    return this.record;
  },

  unloadRecord() {
    this.send('unloadRecord');
  },

  eachRelationship(callback, binding) {
    return this.type.eachRelationship(callback, binding);
  },

  eachAttribute(callback, binding) {
    return this.type.eachAttribute(callback, binding);
  },

  inverseFor(key) {
    return this.type.inverseFor(key);
  },

  setupData(data) {
    var changedKeys = mergeAndReturnChangedKeys(this._data, data);
    this.pushedData();
    if (this.record) {
      this.record._notifyProperties(changedKeys);
    }
    this.didInitalizeData();
  },

  becameReady() {
    Ember.run.schedule('actions', this.store.recordArrayManager, this.store.recordArrayManager.recordWasLoaded, this);
  },

  didInitalizeData() {
    if (!this.dataHasInitialized) {
      this.becameReady();
      this.dataHasInitialized = true;
    }
  },

  destroy() {
    if (this.record) {
      return this.record.destroy();
    }
  },

  /**
    @method createSnapshot
    @private
  */
  createSnapshot() {
    return new Snapshot(this);
  },

  /**
    @method loadingData
    @private
    @param {Promise} promise
  */
  loadingData(promise) {
    this.send('loadingData', promise);
  },

  /**
    @method loadedData
    @private
  */
  loadedData() {
    this.send('loadedData');
    this.didInitalizeData();
  },

  /**
    @method notFound
    @private
  */
  notFound() {
    this.send('notFound');
  },

  /**
    @method pushedData
    @private
  */
  pushedData() {
    this.send('pushedData');
  },

  flushChangedAttributes() {
    this._inFlightAttributes = this._attributes;
    this._attributes = Ember.create(null);
  },

  /**
    @method adapterWillCommit
    @private
  */
  adapterWillCommit() {
    this.send('willCommit');
  },

  /**
    @method adapterDidDirty
    @private
  */
  adapterDidDirty() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  },

  /**
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send(name, context) {
    var currentState = get(this, 'currentState');

    if (!currentState[name]) {
      this._unhandledEvent(currentState, name, context);
    }

    return currentState[name](this, context);
  },

  notifyHasManyAdded(key, record, idx) {
    if (this.record) {
      this.record.notifyHasManyAdded(key, record, idx);
    }
  },

  notifyHasManyRemoved(key, record, idx) {
    if (this.record) {
      this.record.notifyHasManyRemoved(key, record, idx);
    }
  },

  notifyBelongsToChanged(key, record) {
    if (this.record) {
      this.record.notifyBelongsToChanged(key, record);
    }
  },

  notifyPropertyChange(key) {
    if (this.record) {
      this.record.notifyPropertyChange(key);
    }
  },

  rollback() {
    var dirtyKeys = Ember.keys(this._attributes);

    this._attributes = Ember.create(null);

    if (get(this, 'isError')) {
      this._inFlightAttributes = Ember.create(null);
      this.didCleanError();
    }

    //Eventually rollback will always work for relationships
    //For now we support it only out of deleted state, because we
    //have an explicit way of knowing when the server acked the relationship change
    if (this.isDeleted()) {
      //TODO: Should probably move this to the state machine somehow
      this.becameReady();
      this.reconnectRelationships();
    }

    if (this.isNew()) {
      this.clearRelationships();
    }

    if (this.isValid()) {
      this._inFlightAttributes = Ember.create(null);
    }

    this.send('rolledBack');

    this.record._notifyProperties(dirtyKeys);

  },
  /**
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo(name) {
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

  _unhandledEvent(state, name, context) {
    var errorMessage = "Attempted to handle event `" + name + "` ";
    errorMessage    += "on " + String(this) + " while in state ";
    errorMessage    += state.stateName + ". ";

    if (context !== undefined) {
      errorMessage  += "Called with " + Ember.inspect(context) + ".";
    }

    throw new Ember.Error(errorMessage);
  },

  triggerLater() {
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

  _triggerDeferredTriggers() {
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
  /**
    @method clearRelationships
    @private
  */
  clearRelationships() {
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

  disconnectRelationships() {
    this.eachRelationship(function(name, relationship) {
      this._relationships[name].disconnect();
    }, this);
    var model = this;
    forEach.call(Ember.keys(this._implicitRelationships), function(key) {
      model._implicitRelationships[key].disconnect();
    });
  },

  reconnectRelationships() {
    this.eachRelationship(function(name, relationship) {
      this._relationships[name].reconnect();
    }, this);
    var model = this;
    forEach.call(Ember.keys(this._implicitRelationships), function(key) {
      model._implicitRelationships[key].reconnect();
    });
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
  _preloadData(preload) {
    var record = this;
    //TODO(Igor) consider the polymorphic case
    forEach.call(Ember.keys(preload), function(key) {
      var preloadValue = get(preload, key);
      var relationshipMeta = record.type.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        record._preloadRelationship(key, preloadValue);
      } else {
        record._data[key] = preloadValue;
      }
    });
  },

  _preloadRelationship(key, preloadValue) {
    var relationshipMeta = this.type.metaForProperty(key);
    var type = relationshipMeta.type;
    if (relationshipMeta.kind === 'hasMany') {
      this._preloadHasMany(key, preloadValue, type);
    } else {
      this._preloadBelongsTo(key, preloadValue, type);
    }
  },

  _preloadHasMany(key, preloadValue, type) {
    Ember.assert("You need to pass in an array to set a hasMany property on a record", Ember.isArray(preloadValue));
    var internalModel = this;

    var recordsToSet = map.call(preloadValue, function(recordToPush) {
      return internalModel._convertStringOrNumberIntoInternalModel(recordToPush, type);
    });
    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships[key].updateRecordsFromAdapter(recordsToSet);
  },

  _preloadBelongsTo(key, preloadValue, type) {
    var recordToSet = this._convertStringOrNumberIntoInternalModel(preloadValue, type);

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships[key].setRecord(recordToSet);
  },

  _convertStringOrNumberIntoInternalModel(value, type) {
    if (typeof value === 'string' || typeof value === 'number') {
      return this.store._internalModelForId(type, value);
    }
    if (value._internalModel) {
      return value._internalModel;
    }
    return value;
  },


  /**
    @method updateRecordArrays
    @private
  */
  updateRecordArrays() {
    this._updatingRecordArraysLater = false;
    this.store.dataWasUpdated(this.type, this);
  },

  setId(id) {
    this.id = id;
    //TODO figure out whether maybe we should proxy
    set(this.record, 'id', id);
  },

  didError() {
    this.isError = true;
    if (this.record) {
      this.record.set('isError', true);
    }
  },

  didCleanError() {
    this.isError = false;
    if (this.record) {
      this.record.set('isError', false);
    }
  },
  /**
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.

    @method adapterDidCommit
  */
  adapterDidCommit(data) {
    var changedKeys;
    this.didCleanError();

    if (data) {
      changedKeys = mergeAndReturnChangedKeys(this._data, data);
    } else {
      merge(this._data, this._inFlightAttributes);
    }

    this._inFlightAttributes = Ember.create(null);

    this.send('didCommit');
    this.updateRecordArraysLater();

    if (!data) { return; }

    this.record._notifyProperties(changedKeys);
  },

  /**
    @method updateRecordArraysLater
    @private
  */
  updateRecordArraysLater() {
    // quick hack (something like this could be pushed into run.once
    if (this._updatingRecordArraysLater) { return; }
    this._updatingRecordArraysLater = true;
    Ember.run.schedule('actions', this, this.updateRecordArrays);
  },

  getErrors() {
    if (this.errors) {
      return this.errors;
    }
    var errors = Errors.create();

    errors.registerHandlers(this, function() {
      this.send('becameInvalid');
    }, function() {
      this.send('becameValid');
    });

    this.errors = errors;
    return errors;
  },
  // FOR USE DURING COMMIT PROCESS

  /**
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate(errors) {
    var recordErrors = this.getErrors();
    forEach.call(Ember.keys(errors), (key) => {
      recordErrors.add(key, errors[key]);
    });
    this._saveWasRejected();
  },

  /**
    @method adapterDidError
    @private
  */
  adapterDidError() {
    this.send('becameError');
    this.didError();
    this._saveWasRejected();
  },

  _saveWasRejected() {
    var keys = Ember.keys(this._inFlightAttributes);
    for (var i=0; i < keys.length; i++) {
      if (this._attributes[keys[i]] === undefined) {
        this._attributes[keys[i]] = this._inFlightAttributes[keys[i]];
      }
    }
    this._inFlightAttributes = Ember.create(null);
  },

  toString() {
    if (this.record) {
      return this.record.toString();
    } else {
      return `<${this.modelName}:${this.id}>`;
    }
  }
};

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

export default InternalModel;
