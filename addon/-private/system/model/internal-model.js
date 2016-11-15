import Ember from 'ember';
import { assert, runInDebug } from "ember-data/-private/debug";
import RootState from "ember-data/-private/system/model/states";
import Relationships from "ember-data/-private/system/relationships/state/create";
import Snapshot from "ember-data/-private/system/snapshot";
import EmptyObject from "ember-data/-private/system/empty-object";
import isEnabled from 'ember-data/-private/features';

import {
  getOwner
} from 'ember-data/-private/utils';

import {
  RecordReference,
  BelongsToReference,
  HasManyReference
} from "ember-data/-private/system/references";

const {
  get,
  set,
  copy,
  Error: EmberError,
  inspect,
  isEmpty,
  isEqual,
  run: emberRun,
  setOwner,
  RSVP,
  RSVP: { Promise }
} = Ember;

const assign = Ember.assign || Ember.merge;

/*
  The TransitionChainMap caches the `state.enters`, `state.setups`, and final state reached
  when transitioning from one state to another, so that future transitions can replay the
  transition without needing to walk the state tree, collect these hook calls and determine
   the state to transition into.

   A future optimization would be to build a single chained method out of the collected enters
   and setups. It may also be faster to do a two level cache (from: { to }) instead of caching based
   on a key that adds the two together.
 */
const TransitionChainMap = new EmptyObject();

const _extractPivotNameCache = new EmptyObject();
const _splitOnDotCache = new EmptyObject();

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

// this (and all heimdall instrumentation) will be stripped by a babel transform
//  https://github.com/heimdalljs/babel5-plugin-strip-heimdall
const {
  _triggerDeferredTriggers,
  changedAttributes,
  createSnapshot,
  flushChangedAttributes,
  hasChangedAttributes,
  materializeRecord,
  new_InternalModel,
  send,
  setupData,
  transitionTo,
  updateChangedAttributes
} = heimdall.registerMonitor('InternalModel',
  '_triggerDeferredTriggers',
  'changedAttributes',
  'createSnapshot',
  'flushChangedAttributes',
  'hasChangedAttributes',
  'materializeRecord',
  'new_InternalModel',
  'send',
  'setupData',
  'transitionTo',
  'updateChangedAttributes'
);

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
export default class InternalModel {
  constructor(modelClass, id, store, data) {
    heimdall.increment(new_InternalModel);
    this.modelClass = modelClass;
    this.id = id;
    this.store = store;
    this._data = data || new EmptyObject();
    this.modelName = modelClass.modelName;
    this.dataHasInitialized = false;
    this._loadingPromise = null;
    this._recordArrays = undefined;
    this._record = null;
    this.currentState = RootState.empty;
    this.isReloading = false;
    this._isDestroyed = false;
    this.isError = false;
    this.error = null;

    // caches for lazy getters
    this.__deferredTriggers = null;
    this._references = null;
    this._recordReference = null;
    this.__inFlightAttributes = null;
    this.__relationships = null;
    this.__attributes = null;
    this.__implicitRelationships = null;
  }

  get type() {
    return this.modelClass;
  }

  get recordReference() {
    if (this._recordReference === null) {
      this._recordReference = new RecordReference(this.store, this)
    }
    return this._recordReference;
  }

  get references() {
    if (this._references === null) {
      this._references = new EmptyObject();
    }
    return this._references;
  }

  get _deferredTriggers() {
    if (this.__deferredTriggers === null) {
      this.__deferredTriggers = [];
    }
    return this.__deferredTriggers;
  }

  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = new EmptyObject();
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
  }

  get _relationships() {
    if (this.__relationships === null) {
      this.__relationships = new Relationships(this);
    }

    return this.__relationships;
  }

  get _inFlightAttributes() {
    if (this.__inFlightAttributes === null) {
      this.__inFlightAttributes = new EmptyObject();
    }
    return this.__inFlightAttributes;
  }

  set _inFlightAttributes(v) {
    this.__inFlightAttributes = v;
  }

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
  get _implicitRelationships() {
    if (this.__implicitRelationships === null) {
      this.__implicitRelationships = new EmptyObject();
    }
    return this.__implicitRelationships;
  }

  isEmpty() {
    return this.currentState.isEmpty;
  }

  isLoading() {
    return this.currentState.isLoading;
  }

  isLoaded() {
    return this.currentState.isLoaded;
  }

  hasDirtyAttributes() {
    return this.currentState.hasDirtyAttributes;
  }

  isSaving() {
    return this.currentState.isSaving;
  }

  isDeleted() {
    return this.currentState.isDeleted;
  }

  isNew() {
    return this.currentState.isNew;
  }

  isValid() {
    return this.currentState.isValid;
  }

  dirtyType() {
    return this.currentState.dirtyType;
  }

  get record() {
    return this._record;
  }

  getRecord() {
    if (!this._record) {
      heimdall.increment(materializeRecord);

      // lookupFactory should really return an object that creates
      // instances with the injections applied
      let createOptions = {
        store: this.store,
        _internalModel: this,
        id: this.id,
        currentState: this.currentState,
        isError: this.isError,
        adapterError: this.error
      };

      if (setOwner) {
        // ensure that `getOwner(this)` works inside a model instance
        setOwner(createOptions, getOwner(this.store));
      } else {
        createOptions.container = this.store.container;
      }

      this._record = this.modelClass._create(createOptions);

      this._triggerDeferredTriggers();
    }

    return this._record;
  }

  recordObjectWillDestroy() {
    this._record = null;
  }

  deleteRecord() {
    this.send('deleteRecord');
  }

  save(options) {
    let promiseLabel = "DS: Model#save " + this;
    let resolver = RSVP.defer(promiseLabel);

    this.store.scheduleSave(this, resolver, options);
    return resolver.promise;
  }

  startedReloading() {
    this.isReloading = true;
    if (this.hasRecord) {
      set(this.record, 'isReloading', true);
    }
  }

  finishedReloading() {
    this.isReloading = false;
    if (this.hasRecord) {
      set(this.record, 'isReloading', false);
    }
  }

  reload() {
    this.startedReloading();
    let internalModel = this;
    let promiseLabel = "DS: Model#reload of " + this;

    return new Promise(function(resolve) {
      internalModel.send('reloadRecord', resolve);
    }, promiseLabel).then(function() {
      internalModel.didCleanError();
      return internalModel;
    }, function(error) {
      internalModel.didError(error);
      throw error;
    }, "DS: Model#reload complete, update flags").finally(function () {
      internalModel.finishedReloading();
      internalModel.updateRecordArrays();
    });
  }

  unloadRecord() {
    this.send('unloadRecord');
  }

  eachRelationship(callback, binding) {
    return this.modelClass.eachRelationship(callback, binding);
  }

  eachAttribute(callback, binding) {
    return this.modelClass.eachAttribute(callback, binding);
  }

  inverseFor(key) {
    return this.modelClass.inverseFor(key);
  }

  setupData(data) {
    heimdall.increment(setupData);
    let changedKeys = this._changedKeys(data.attributes);
    assign(this._data, data.attributes);
    this.pushedData();
    if (this.hasRecord) {
      this.record._notifyProperties(changedKeys);
    }
    this.didInitializeData();
  }

  becameReady() {
    emberRun.schedule('actions', this.store.recordArrayManager, this.store.recordArrayManager.recordWasLoaded, this);
  }

  didInitializeData() {
    if (!this.dataHasInitialized) {
      this.becameReady();
      this.dataHasInitialized = true;
    }
  }

  get isDestroyed() {
    return this._isDestroyed;
  }

  get hasRecord() {
    return !!this._record;
  }

  destroy() {
    this._isDestroyed = true;
    if (this.hasRecord) {
      return this.record.destroy();
    }
  }

  /*
    @method createSnapshot
    @private
  */
  createSnapshot(options) {
    heimdall.increment(createSnapshot);
    return new Snapshot(this, options);
  }

  /*
    @method loadingData
    @private
    @param {Promise} promise
  */
  loadingData(promise) {
    this.send('loadingData', promise);
  }

  /*
    @method loadedData
    @private
  */
  loadedData() {
    this.send('loadedData');
    this.didInitializeData();
  }

  /*
    @method notFound
    @private
  */
  notFound() {
    this.send('notFound');
  }

  /*
    @method pushedData
    @private
  */
  pushedData() {
    this.send('pushedData');
  }

  flushChangedAttributes() {
    heimdall.increment(flushChangedAttributes);
    this._inFlightAttributes = this._attributes;
    this._attributes = new EmptyObject();
  }

  hasChangedAttributes() {
    heimdall.increment(hasChangedAttributes);
    return Object.keys(this._attributes).length > 0;
  }

  /*
    Checks if the attributes which are considered as changed are still
    different to the state which is acknowledged by the server.

    This method is needed when data for the internal model is pushed and the
    pushed data might acknowledge dirty attributes as confirmed.

    @method updateChangedAttributes
    @private
   */
  updateChangedAttributes() {
    heimdall.increment(updateChangedAttributes);
    let changedAttributes = this.changedAttributes();
    let changedAttributeNames = Object.keys(changedAttributes);
    let attrs = this._attributes;

    for (let i = 0, length = changedAttributeNames.length; i < length; i++) {
      let attribute = changedAttributeNames[i];
      let data = changedAttributes[attribute];
      let oldData = data[0];
      let newData = data[1];

      if (oldData === newData) {
        delete attrs[attribute];
      }
    }
  }

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
    heimdall.increment(changedAttributes);
    let oldData = this._data;
    let currentData = this._attributes;
    let inFlightData = this._inFlightAttributes;
    let newData = assign(copy(inFlightData), currentData);
    let diffData = new EmptyObject();
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      diffData[key] = [oldData[key], newData[key]];
    }

    return diffData;
  }

  /*
    @method adapterWillCommit
    @private
  */
  adapterWillCommit() {
    this.send('willCommit');
  }

  /*
    @method adapterDidDirty
    @private
  */
  adapterDidDirty() {
    this.send('becomeDirty');
    this.updateRecordArraysLater();
  }

  /*
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send(name, context) {
    heimdall.increment(send);
    let currentState = this.currentState;

    if (!currentState[name]) {
      this._unhandledEvent(currentState, name, context);
    }

    return currentState[name](this, context);
  }

  notifyHasManyAdded(key, record, idx) {
    if (this.hasRecord) {
      this.record.notifyHasManyAdded(key, record, idx);
    }
  }

  notifyHasManyRemoved(key, record, idx) {
    if (this.hasRecord) {
      this.record.notifyHasManyRemoved(key, record, idx);
    }
  }

  notifyBelongsToChanged(key, record) {
    if (this.hasRecord) {
      this.record.notifyBelongsToChanged(key, record);
    }
  }

  notifyPropertyChange(key) {
    if (this.hasRecord) {
      this.record.notifyPropertyChange(key);
    }
  }

  rollbackAttributes() {
    let dirtyKeys = Object.keys(this._attributes);

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
  }

  /*
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo(name) {
    heimdall.increment(transitionTo);
    // POSSIBLE TODO: Remove this code and replace with
    // always having direct reference to state objects

    let pivotName = extractPivotName(name);
    let state = this.currentState;
    let transitionMapId = `${state.stateName}->${name}`;

    do {
      if (state.exit) { state.exit(this); }
      state = state.parentState;
    } while (!state[pivotName]);

    let setups;
    let enters;
    let i;
    let l;
    let map = TransitionChainMap[transitionMapId];

    if (map) {
      setups = map.setups;
      enters = map.enters;
      state = map.state;
    } else {
      setups = [];
      enters = [];

      let path = splitOnDot(name);

      for (i = 0, l = path.length; i < l; i++) {
        state = state[path[i]];

        if (state.enter) { enters.push(state); }
        if (state.setup) { setups.push(state); }
      }

      TransitionChainMap[transitionMapId] = { setups, enters, state };
    }

    for (i = 0, l = enters.length; i < l; i++) {
      enters[i].enter(this);
    }

    this.currentState = state;
    if (this.hasRecord) {
      set(this.record, 'currentState', state);
    }

    for (i = 0, l = setups.length; i < l; i++) {
      setups[i].setup(this);
    }

    this.updateRecordArraysLater();
  }

  _unhandledEvent(state, name, context) {
    let errorMessage = "Attempted to handle event `" + name + "` ";
    errorMessage    += "on " + String(this) + " while in state ";
    errorMessage    += state.stateName + ". ";

    if (context !== undefined) {
      errorMessage  += "Called with " + inspect(context) + ".";
    }

    throw new EmberError(errorMessage);
  }

  triggerLater(...args) {
    if (this._deferredTriggers.push(args) !== 1) {
      return;
    }
    emberRun.schedule('actions', this, this._triggerDeferredTriggers);
  }

  _triggerDeferredTriggers() {
    heimdall.increment(_triggerDeferredTriggers);
    //TODO: Before 1.0 we want to remove all the events that happen on the pre materialized record,
    //but for now, we queue up all the events triggered before the record was materialized, and flush
    //them once we have the record
    if (!this.hasRecord) {
      return;
    }
    for (let i = 0, l= this._deferredTriggers.length; i<l; i++) {
      this.record.trigger.apply(this.record, this._deferredTriggers[i]);
    }

    this._deferredTriggers.length = 0;
  }

  /*
    @method clearRelationships
    @private
  */
  clearRelationships() {
    this.eachRelationship((name, relationship) => {
      if (this._relationships.has(name)) {
        let rel = this._relationships.get(name);
        rel.clear();
        rel.destroy();
      }
    });
    Object.keys(this._implicitRelationships).forEach((key) => {
      this._implicitRelationships[key].clear();
      this._implicitRelationships[key].destroy();
    });
  }

  /*
    When a find request is triggered on the store, the user can optionally pass in
    attributes and relationships to be preloaded. These are meant to behave as if they
    came back from the server, except the user obtained them out of band and is informing
    the store of their existence. The most common use case is for supporting client side
    nested URLs, such as `/posts/1/comments/2` so the user can do
    `store.findRecord('comment', 2, { preload: { post: 1 } })` without having to fetch the post.

    Preloaded data can be attributes and relationships passed in either as IDs or as actual
    models.

    @method preloadData
    @private
    @param {Object} preload
  */
  preloadData(preload) {
    //TODO(Igor) consider the polymorphic case
    Object.keys(preload).forEach((key) => {
      let preloadValue = get(preload, key);
      let relationshipMeta = this.modelClass.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        this._preloadRelationship(key, preloadValue);
      } else {
        this._data[key] = preloadValue;
      }
    });
  }

  _preloadRelationship(key, preloadValue) {
    let relationshipMeta = this.modelClass.metaForProperty(key);
    let modelClass = relationshipMeta.type;
    if (relationshipMeta.kind === 'hasMany') {
      this._preloadHasMany(key, preloadValue, modelClass);
    } else {
      this._preloadBelongsTo(key, preloadValue, modelClass);
    }
  }

  _preloadHasMany(key, preloadValue, modelClass) {
    assert("You need to pass in an array to set a hasMany property on a record", Array.isArray(preloadValue));
    let recordsToSet = new Array(preloadValue.length);

    for (let i = 0; i < preloadValue.length; i++) {
      let recordToPush = preloadValue[i];
      recordsToSet[i] = this._convertStringOrNumberIntoInternalModel(recordToPush, modelClass);
    }

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).updateRecordsFromAdapter(recordsToSet);
  }

  _preloadBelongsTo(key, preloadValue, modelClass) {
    let recordToSet = this._convertStringOrNumberIntoInternalModel(preloadValue, modelClass);

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).setRecord(recordToSet);
  }

  _convertStringOrNumberIntoInternalModel(value, modelClass) {
    if (typeof value === 'string' || typeof value === 'number') {
      return this.store._internalModelForId(modelClass, value);
    }
    if (value._internalModel) {
      return value._internalModel;
    }
    return value;
  }

  /*
    @method updateRecordArrays
    @private
  */
  updateRecordArrays() {
    this._updatingRecordArraysLater = false;
    this.store.dataWasUpdated(this.modelClass, this);
  }

  setId(id) {
    assert('A record\'s id cannot be changed once it is in the loaded state', this.id === null || this.id === id || this.isNew());
    this.id = id;
    if (this.record.get('id') !== id) {
      this.record.set('id', id);
    }
  }

  didError(error) {
    this.error = error;
    this.isError = true;

    if (this.hasRecord) {
      this.record.setProperties({
        isError: true,
        adapterError: error
      });
    }
  }

  didCleanError() {
    this.error = null;
    this.isError = false;

    if (this.hasRecord) {
      this.record.setProperties({
        isError: false,
        adapterError: null
      });
    }
  }

  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.

    @method adapterDidCommit
  */
  adapterDidCommit(data) {
    if (data) {
      data = data.attributes;
    }

    this.didCleanError();
    let changedKeys = this._changedKeys(data);

    assign(this._data, this._inFlightAttributes);
    if (data) {
      assign(this._data, data);
    }

    this._inFlightAttributes = new EmptyObject();

    this.send('didCommit');
    this.updateRecordArraysLater();

    if (!data) { return; }

    this.record._notifyProperties(changedKeys);
  }

  /*
    @method updateRecordArraysLater
    @private
  */
  updateRecordArraysLater() {
    // quick hack (something like this could be pushed into run.once
    if (this._updatingRecordArraysLater) { return; }
    this._updatingRecordArraysLater = true;
    emberRun.schedule('actions', this, this.updateRecordArrays);
  }

  addErrorMessageToAttribute(attribute, message) {
    get(this.getRecord(), 'errors')._add(attribute, message);
  }

  removeErrorMessageFromAttribute(attribute) {
    get(this.getRecord(), 'errors')._remove(attribute);
  }

  clearErrorMessages() {
    get(this.getRecord(), 'errors')._clear();
  }

  hasErrors() {
    let errors = get(this.getRecord(), 'errors');

    return !isEmpty(errors);
  }

  // FOR USE DURING COMMIT PROCESS

  /*
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate(errors) {
    let attribute;

    for (attribute in errors) {
      if (errors.hasOwnProperty(attribute)) {
        this.addErrorMessageToAttribute(attribute, errors[attribute]);
      }
    }

    this.send('becameInvalid');

    this._saveWasRejected();
  }

  /*
    @method adapterDidError
    @private
  */
  adapterDidError(error) {
    this.send('becameError');
    this.didError(error);
    this._saveWasRejected();
  }

  _saveWasRejected() {
    let keys = Object.keys(this._inFlightAttributes);
    let attrs = this._attributes;
    for (let i=0; i < keys.length; i++) {
      if (attrs[keys[i]] === undefined) {
        attrs[keys[i]] = this._inFlightAttributes[keys[i]];
      }
    }
    this._inFlightAttributes = new EmptyObject();
  }

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
  _changedKeys(updates) {
    let changedKeys = [];

    if (updates) {
      let original, i, value, key;
      let keys = Object.keys(updates);
      let length = keys.length;
      let attrs = this._attributes;

      original = assign(new EmptyObject(), this._data);
      original = assign(original, this._inFlightAttributes);

      for (i = 0; i < length; i++) {
        key = keys[i];
        value = updates[key];

        // A value in _attributes means the user has a local change to
        // this attributes. We never override this value when merging
        // updates from the backend so we should not sent a change
        // notification if the server value differs from the original.
        if (attrs[key] !== undefined) {
          continue;
        }

        if (!isEqual(original[key], value)) {
          changedKeys.push(key);
        }
      }
    }

    return changedKeys;
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }

  referenceFor(kind, name) {
    let reference = this.references[name];

    if (!reference) {
      let relationship = this._relationships.get(name);

      runInDebug(() => {
        let modelName = this.modelName;
        assert(`There is no ${kind} relationship named '${name}' on a model of modelClass '${modelName}'`, relationship);

        let actualRelationshipKind = relationship.relationshipMeta.kind;
        assert(`You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`, actualRelationshipKind === kind);
      });

      if (kind === "belongsTo") {
        reference = new BelongsToReference(this.store, this, relationship);
      } else if (kind === "hasMany") {
        reference = new HasManyReference(this.store, this, relationship);
      }

      this.references[name] = reference;
    }

    return reference;
  }
}

if (isEnabled('ds-reset-attribute')) {
  /*
     Returns the latest truth for an attribute - the canonical value, or the
     in-flight value.

     @method lastAcknowledgedValue
     @private
  */
  InternalModel.prototype.lastAcknowledgedValue = function lastAcknowledgedValue(key) {
    if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  };
}
