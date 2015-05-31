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

var Reference = function(type, id, store, container, data) {
  this.type = type;
  this.id = id;
  this.store = store;
  this.container = container;
  this._data = data || {};
  this.modelName = type.modelName;
  this.errors = null;
  this.dataHasInitialized = false;
  this._deferredTriggers = [];
  this._data = {};
  this._attributes = Ember.create(null);
  this._inFlightAttributes = Ember.create(null);
  this._relationships = {};
  this.currentState = RootState.empty;
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

Reference.prototype = {
  isEmpty: retrieveFromCurrentState('isEmpty'),
  isLoading: retrieveFromCurrentState('isLoading'),
  isLoaded: retrieveFromCurrentState('isLoaded'),
  isDirty: retrieveFromCurrentState('isDirty'),
  isSaving: retrieveFromCurrentState('isSaving'),
  isDeleted: retrieveFromCurrentState('isDeleted'),
  isNew: retrieveFromCurrentState('isNew'),
  isValid: retrieveFromCurrentState('isValid'),
  dirtyType: retrieveFromCurrentState('dirtyType'),

  constructor: Reference,
  materializeRecord: function() {
    // lookupFactory should really return an object that creates
    // instances with the injections applied
    this.record = this.type._create({
      id: this.id,
      store: this.store,
      container: this.container
    });
    this.record._internalModel = this;
    //TODO Probably should call deferred triggers here
  },

  recordObjectWillDestroy: function() {
    this.record = null;
  },


  deleteRecord: function() {
    this.send('deleteRecord');
  },

  save: function() {
    var promiseLabel = "DS: Model#save " + this;
    var resolver = Ember.RSVP.defer(promiseLabel);

    this.store.scheduleSave(this, resolver);
    this._inFlightAttributes = this._attributes;
    this._attributes = Ember.create(null);

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
      //TODO FIXMEMEMEMEME
      record.record.set('isReloading', false);
      record.didCleanError();
      return record;
    }, function(reason) {
      record.didError();
      throw reason;
    }, "DS: Model#reload complete, update flags")['finally'](function () {
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
    var changedKeys = mergeAndReturnChangedKeys(this._data, data);
    this.pushedData();
    if (this.record) {
      this.record._notifyProperties(changedKeys);
    }
    this.didInitalizeData();
  },

  becameReady: function() {
    var self = this;
    Ember.run.schedule('actions', function() {
      self.store.recordArrayManager.recordWasLoaded(self);
    });
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

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot: function() {
    return new Snapshot(this);
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
    this.didInitalizeData();
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
    @method adapterWillCommit
    @private
  */
  adapterWillCommit: function() {
    this.send('willCommit');
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
  rollback: function() {
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
    Ember.run.schedule('actions', this, '_triggerDeferredTriggers');
  },

  //TODO double check whether we care about having the record
  _triggerDeferredTriggers: function() {
    //TODO Worry about didLoad etc. that people might be defining/using
    //Queue up, to be ran once there is a record
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
      var relationshipMeta = record.type.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        record._preloadRelationship(key, preloadValue);
      } else {
        get(record, '_data')[key] = preloadValue;
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

  //TODO Rename to internalModel
  _convertStringOrNumberIntoRecord: function(value, type) {
    if (Ember.typeOf(value) === 'string' || Ember.typeOf(value) === 'number') {
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
  updateRecordArrays: function() {
    this._updatingRecordArraysLater = false;
    this.store.dataWasUpdated(this.type, this);
  },

  setId: function(id) {
    this.id = id;
    //TODO figure out whether maybe we should proxy
    set(this.record, 'id', id);
  },

  didError: function() {
    this.isError = true;
    if (this.record) {
      this.record.set('isError', true);
    }
  },

  didCleanError: function() {
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
  adapterDidCommit: function(data) {
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
  updateRecordArraysLater: function() {
    // quick hack (something like this could be pushed into run.once
    if (this._updatingRecordArraysLater) { return; }
    this._updatingRecordArraysLater = true;
    Ember.run.schedule('actions', this, this.updateRecordArrays);
  },

  getErrors: function() {
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
  adapterDidInvalidate: function(errors) {
    var recordErrors = this.getErrors();
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
    this.didError();
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

export default Reference;
