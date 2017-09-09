import Ember from 'ember';
import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import RootState from "./states";
import Relationships from "../relationships/state/create";
import Snapshot from "../snapshot";
import isEnabled from '../../features';
import OrderedSet from "../ordered-set";

import { getOwner } from '../../utils';

import {
  RecordReference,
  BelongsToReference,
  HasManyReference
} from "../references";

const {
  get,
  set,
  copy,
  Error: EmberError,
  inspect,
  isEmpty,
  isEqual,
  setOwner,
  run,
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
const TransitionChainMap = Object.create(null);

const _extractPivotNameCache = Object.create(null);
const _splitOnDotCache = Object.create(null);

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

function areAllModelsUnloaded(internalModels) {
  for (let i=0; i<internalModels.length; ++i) {
    let record = internalModels[i]._record;
    if (record && !(record.get('isDestroyed') || record.get('isDestroying'))) {
      return false;
    }
  }
  return true;
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

let InternalModelReferenceId = 1;
let nextBfsId = 1;

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
  constructor(modelName, id, store, data) {
    heimdall.increment(new_InternalModel);
    this.id = id;

    // this ensure ordered set can quickly identify this as unique
    this[Ember.GUID_KEY] = InternalModelReferenceId++ + 'internal-model';

    this.store = store;
    this.modelName = modelName;
    this._loadingPromise = null;
    this._record = null;
    this._isDestroyed = false;
    this.isError = false;
    this._isUpdatingRecordArrays = false; // used by the recordArrayManager

    // During dematerialization we don't want to rematerialize the record.  The
    // reason this might happen is that dematerialization removes records from
    // record arrays,  and Ember arrays will always `objectAt(0)` and
    // `objectAt(len - 1)` to test whether or not `firstObject` or `lastObject`
    // have changed.
    this._isDematerializing = false;
    this._scheduledDestroy = null;

    this.resetRecord();

    if (data) {
      this.__data = data;
    }

    // caches for lazy getters
    this._modelClass = null;
    this.__deferredTriggers = null;
    this.__recordArrays = null;
    this._references = null;
    this._recordReference = null;
    this.__relationships = null;
    this.__implicitRelationships = null;

    // Used during the mark phase of unloading to avoid checking the same internal
    // model twice in the same scan
    this._bfsId = 0;
  }

  get modelClass() {
    return this._modelClass || (this._modelClass = this.store._modelFor(this.modelName));
  }

  get type() {
    return this.modelClass;
  }

  get recordReference() {
    if (this._recordReference === null) {
      this._recordReference = new RecordReference(this.store, this);
    }
    return this._recordReference;
  }

  get _recordArrays() {
    if (this.__recordArrays === null) {
      this.__recordArrays = OrderedSet.create();
    }
    return this.__recordArrays;
  }

  get references() {
    if (this._references === null) {
      this._references = Object.create(null);
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
      this.__attributes = Object.create(null);
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
      this.__inFlightAttributes = Object.create(null);
    }
    return this.__inFlightAttributes;
  }

  set _inFlightAttributes(v) {
    this.__inFlightAttributes = v;
  }

  get _data() {
    if (this.__data === null) {
      this.__data = Object.create(null);
    }
    return this.__data;
  }

  set _data(v) {
    this.__data = v;
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
      this.__implicitRelationships = Object.create(null);
    }
    return this.__implicitRelationships;
  }

  isHiddenFromRecordArrays() {
    // During dematerialization we don't want to rematerialize the record.
    // recordWasDeleted can cause other records to rematerialize because it
    // removes the internal model from the array and Ember arrays will always
    // `objectAt(0)` and `objectAt(len -1)` to check whether `firstObject` or
    // `lastObject` have changed.  When this happens we don't want those
    // models to rematerialize their records.

    return this._isDematerializing ||
      this.isDestroyed ||
      this.currentState.stateName === 'root.deleted.saved' ||
      this.isEmpty();
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

  getRecord(properties, modelName = this.modelName) {
    if (this._record && this._record[modelName]) {
      return this._record[modelName];
    }
    if (this._isDematerializing) {
      return null;
    }

    heimdall.increment(materializeRecord);
    let token = heimdall.start('InternalModel.getRecord');

    // lookupFactory should really return an object that creates
    // instances with the injections applied
    let createOptions = {
      // TODO Find better way for modelName to be known by the model
      _modelName: modelName,
      store: this.store,
      _internalModel: this,
      id: this.id,
      currentState: this.currentState,
      isError: this.isError,
      adapterError: this.error
    };

    if (typeof properties === 'object' && properties !== null) {
      assign(createOptions, properties);
    }

    if (setOwner) {
      // ensure that `getOwner(this)` works inside a model instance
      setOwner(createOptions, getOwner(this.store));
    } else {
      createOptions.container = this.store.container;
    }

    this._record = this._record || Object.create(null);
    const newRecord = this._record[modelName] = this.store.modelFactoryFor(modelName).create(createOptions);

    this._triggerDeferredTriggersFor(modelName);
    heimdall.stop(token);

    return newRecord;
  }

  resetRecord() {
    this._record = null;
    this.dataHasInitialized = false;
    this.isReloading = false;
    this.error = null;
    this.currentState = RootState.empty;
    this.__attributes = null;
    this.__inFlightAttributes = null;
    this._data = null;
  }

  dematerializeRecords() {
    if (this._record) {
      this._isDematerializing = true;
      this.applyToRecords((record) => record.destroy());
      this.destroyRelationships();
      this.updateRecordArrays();
      this.resetRecord();
    }
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

  applyToRecords(fn) {
    if (!this._record) {
      return;
    }
    let materializedRecords = Object.keys(this._record);
    for (let i = 0; i < materializedRecords.length; i++) {
      fn.call(this, this._record[materializedRecords[i]]);
    }
  }

  startedReloading() {
    this.isReloading = true;
  }

  finishedReloading() {
    this.isReloading = false;
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

  /**
    Computes the set of internal models reachable from `this` across exactly one
    relationship.

    @return {Array} An array containing the internal models that `this` belongs
    to or has many.
  */
  _directlyRelatedInternalModels() {
    let array = [];
    this._relationships.forEach((name, rel) => {
      let local = rel.members.toArray();
      let server = rel.canonicalMembers.toArray();
      array = array.concat(local, server);
    });
    return array;
  }


  /**
    Computes the set of internal models reachable from this internal model.

    Reachability is determined over the relationship graph (ie a graph where
    nodes are internal models and edges are belongs to or has many
    relationships).

    @return {Array} An array including `this` and all internal models reachable
    from `this`.
  */
  _allRelatedInternalModels() {
    let array = [];
    let queue = [];
    let bfsId = nextBfsId++;
    queue.push(this);
    this._bfsId = bfsId;
    while (queue.length > 0) {
      let node = queue.shift();
      array.push(node);
      let related = node._directlyRelatedInternalModels();
      for (let i=0; i<related.length; ++i) {
        let internalModel = related[i];
        assert('Internal Error: seen a future bfs iteration', internalModel._bfsId <= bfsId);
        if (internalModel._bfsId < bfsId) {
          queue.push(internalModel);
          internalModel._bfsId = bfsId;
        }
      }
    }
    return array;
  }


  /**
    Unload the record for this internal model. This will cause the record to be
    destroyed and freed up for garbage collection. It will also do a check
    for cleaning up internal models.

    This check is performed by first computing the set of related internal
    models. If all records in this set are unloaded, then the entire set is
    destroyed. Otherwise, nothing in the set is destroyed.

    This means that this internal model will be freed up for garbage collection
    once all models that refer to it via some relationship are also unloaded.
  */
  unloadRecord(modelName) {
    // TODO Cases where we invoke unloadRecord without a DS.Model
    if (modelName) {
      const record = this._record[modelName];
      if (record) {
        delete this._record[modelName];
        // TODO Do we need to send unloadRecord for the destroyed
        record.destroy();
      }
      if (this.hasRecord) {
        // if there are still records, don't do anything more
        return;
      }
    }
    this.send('unloadRecord');
    this.dematerializeRecords();

    if (this._scheduledDestroy === null) {
      this._scheduledDestroy = run.schedule('destroy', this, '_checkForOrphanedInternalModels');
    }
  }

  hasScheduledDestroy() {
    return !!this._scheduledDestroy;
  }

  cancelDestroy() {
    assert(`You cannot cancel the destruction of an InternalModel once it has already been destroyed`, !this.isDestroyed);

    this._isDematerializing = false;
    run.cancel(this._scheduledDestroy);
    this._scheduledDestroy = null;
  }

  // typically, we prefer to async destroy this lets us batch cleanup work.
  // Unfortunately, some scenarios where that is not possible. Such as:
  //
  // ```js
  // const record = store.find(‘record’, 1);
  // record.unloadRecord();
  // store.createRecord(‘record’, 1);
  // ```
  //
  // In those scenarios, we make that model's cleanup work, sync.
  //
  destroySync() {
    if (this._isDematerializing) {
      this.cancelDestroy();
    }
    this._checkForOrphanedInternalModels();
    if (this.isDestroyed || this.isDestroying) { return; }

    // just in-case we are not one of the orphaned, we should still
    // still destroy ourselves
    this.destroy();
  }

  _checkForOrphanedInternalModels() {
    this._isDematerializing = false;
    this._scheduledDestroy = null;
    if (this.isDestroyed) { return; }

    this._cleanupOrphanedInternalModels();

  }

  _cleanupOrphanedInternalModels() {
    let relatedInternalModels = this._allRelatedInternalModels();
    if (areAllModelsUnloaded(relatedInternalModels)) {
      for (let i=0; i<relatedInternalModels.length; ++i) {
        let internalModel = relatedInternalModels[i];
        if (!internalModel.isDestroyed) {
          internalModel.destroy();
        }
      }
    }
  }

  eachRelationship(callback, binding) {
    return this.modelClass.eachRelationship(callback, binding);
  }

  destroy() {
    assert("Cannot destroy an internalModel while its record is materialized", !this.hasRecord || this.records.every(rec => rec.get('isDestroyed')) || this.records.every(rec => rec.get('isDestroying')));

    this.store._internalModelDestroyed(this);

    this._relationships.forEach((name, rel) => rel.destroy());

    this._isDestroyed = true;
  }

  eachAttribute(callback, binding) {
    return this.modelClass.eachAttribute(callback, binding);
  }

  inverseFor(key) {
    return this.modelClass.inverseFor(key);
  }

  setupData(data) {
    heimdall.increment(setupData);
    this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);

    let changedKeys;

    if (this.hasRecord) {
      changedKeys = this._changedKeys(data.attributes);
    }

    assign(this._data, data.attributes);
    this.pushedData();

    if (this.hasRecord) {
      this.applyToRecords((record) => record._notifyProperties(changedKeys));
    }
    this.didInitializeData();
  }

  becameReady() {
    this.store.recordArrayManager.recordWasLoaded(this);
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
    return this._record && Object.keys(this._record).length > 0;
  }

  get records() {
    if (!this.hasRecord) {
      return [];
    }
    return Object.keys(this._record).map((modelName) => this._record[modelName]);
  }

  hasRecordFor(modelName) {
    return !!(this._record && this._record[modelName]);
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
    this._attributes = null;
  }

  hasChangedAttributes() {
    heimdall.increment(hasChangedAttributes);
    return this.__attributes !== null && Object.keys(this.__attributes).length > 0;
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
    let diffData = Object.create(null);
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
    this.updateRecordArrays();
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
      this.applyToRecords((record) => record.notifyHasManyAdded(key, record, idx));
    }
  }

  notifyBelongsToChanged(key, record) {
    if (this.hasRecord) {
      this.applyToRecords((record) => record.notifyBelongsToChanged(key, record));
    }
  }

  notifyPropertyChange(key) {
    if (this.hasRecord) {
      this.applyToRecords((record) => record.notifyPropertyChange(key));
    }
  }

  rollbackAttributes() {
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }


    if (get(this, 'isError')) {
      this._inFlightAttributes = null;
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
      this.removeFromInverseRelationships(true);
    }

    if (this.isValid()) {
      this._inFlightAttributes = null;
    }

    this.send('rolledBack');

    if (dirtyKeys && dirtyKeys.length > 0) {
      this.dpplyToRecords((record) => record._notifyProperties(dirtyKeys));
    }
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
      this.applyToRecords((record) => set(record, 'currentState', state));
    }

    for (i = 0, l = setups.length; i < l; i++) {
      setups[i].setup(this);
    }

    this.updateRecordArrays();
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

    this.store._updateInternalModel(this);
  }

  _triggerDeferredTriggers() {
    if (!this.hasRecord) {
      return;
    }
    Object.keys(this._record).forEach(this._triggerDeferredTriggersFor.bind(this));
  }

  _triggerDeferredTriggersFor(modelName) {
    heimdall.increment(_triggerDeferredTriggers);
    //TODO: Before 1.0 we want to remove all the events that happen on the pre materialized record,
    //but for now, we queue up all the events triggered before the record was materialized, and flush
    //them once we have the record
    if (!this.hasRecordFor(modelName)) {
      return;
    }
    // TODO This is an interesting challenge - with dynamic records, there is always a possibility to have
    // new record materialized, keeping the old behavior requires all events ever fired on the record to
    // be fired for the new record (including the possibility of duplications), for now, we will do just
    // this and use a pointer in the deferred triggers to keep track, which events were fired on which record
    let triggers = this._deferredTriggers;
    let record = this._record[modelName];
    if (!this._recordNextTrigger) {
      this._recordNextTrigger = {};
    }
    let nextTrigger = this._recordNextTrigger[modelName] || 0;
    let trigger = record.trigger;
    for (let i = nextTrigger, l= triggers.length; i<l; i++) {
      trigger.apply(record, triggers[i]);
    }
    this._recordNextTrigger[modelName] = triggers.length;
  }

  /*
   This method should only be called by records in the `isNew()` state OR once the record
   has been deleted and that deletion has been persisted.

   It will remove this record from any associated relationships.

   If `isNew` is true (default false), it will also completely reset all
    relationships to an empty state as well.

    @method removeFromInverseRelationships
    @param {Boolean} isNew whether to unload from the `isNew` perspective
    @private
   */
  removeFromInverseRelationships(isNew = false) {
    this._relationships.forEach((name, rel) => {
      rel.removeCompletelyFromInverse();
      if (isNew === true) {
        rel.clear();
      }
    });

    let implicitRelationships = this._implicitRelationships;
    this.__implicitRelationships = null;

    Object.keys(implicitRelationships).forEach((key) => {
      let rel = implicitRelationships[key];

      rel.removeCompletelyFromInverse();
      if (isNew === true) {
        rel.clear();
      }
    });
  }

  /*
    Notify all inverses that this internalModel has been dematerialized
    and destroys any ManyArrays.
   */
  destroyRelationships() {
    this._relationships.forEach((name, rel) => {
      if (rel._inverseIsAsync()) {
        rel.removeInternalModelFromInverse(this);
        rel.removeInverseRelationships();
      } else {
        rel.removeCompletelyFromInverse();
      }
    });

    let implicitRelationships = this._implicitRelationships;
    this.__implicitRelationships = null;
    Object.keys(implicitRelationships).forEach((key) => {
      let rel = implicitRelationships[key];

      if (rel._inverseIsAsync()) {
        rel.removeInternalModelFromInverse(this);
        rel.removeInverseRelationships();
      } else {
        rel.removeCompletelyFromInverse();
      }

      rel.destroy();
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
    this._relationships.get(key).updateInternalModelsFromAdapter(recordsToSet);
  }

  _preloadBelongsTo(key, preloadValue, modelClass) {
    let internalModelToSet = this._convertStringOrNumberIntoInternalModel(preloadValue, modelClass);

    //We use the pathway of setting the hasMany as if it came from the adapter
    //because the user told us that they know this relationships exists already
    this._relationships.get(key).setInternalModel(internalModelToSet);
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
    Used to notify the store to update FilteredRecordArray membership.

    @method updateRecordArrays
    @private
  */
  updateRecordArrays() {
    this.store.recordArrayManager.recordDidChange(this);
  }

  setId(id) {
    assert('A record\'s id cannot be changed once it is in the loaded state', this.id === null || this.id === id || this.isNew());
    this.id = id;
    this.applyToRecords((record) => {
      if (record.get('id') !== id) {
        record.set('id', id);
      }
    });
  }

  didError(error) {
    this.error = error;
    this.isError = true;

    if (this.hasRecord) {
      this.applyToRecords((record) => {
        record.setProperties({
          isError: true,
          adapterError: error
        });
      });
    }
  }

  didCleanError() {
    this.error = null;
    this.isError = false;

    if (this.hasRecord) {
      this.applyToRecords((record) => {
        record.setProperties({
          isError: false,
          adapterError: null
        });
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
      this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);

      data = data.attributes;
    }

    this.didCleanError();
    let changedKeys = this._changedKeys(data);

    assign(this._data, this._inFlightAttributes);
    if (data) {
      assign(this._data, data);
    }

    this._inFlightAttributes = null;

    this.send('didCommit');
    this.updateRecordArrays();

    if (!data) { return; }

    this.applyToRecords((record) => record._notifyProperties(changedKeys));
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
    if (keys.length > 0) {
      let attrs = this._attributes;
      for (let i=0; i < keys.length; i++) {
        if (attrs[keys[i]] === undefined) {
          attrs[keys[i]] = this._inFlightAttributes[keys[i]];
        }
      }
    }
    this._inFlightAttributes = null;
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
      let hasAttrs = this.hasChangedAttributes();
      let attrs;
      if (hasAttrs) {
        attrs= this._attributes;
      }

      original = assign(Object.create(null), this._data);
      original = assign(original, this._inFlightAttributes);

      for (i = 0; i < length; i++) {
        key = keys[i];
        value = updates[key];

        // A value in _attributes means the user has a local change to
        // this attributes. We never override this value when merging
        // updates from the backend so we should not sent a change
        // notification if the server value differs from the original.
        if (hasAttrs === true && attrs[key] !== undefined) {
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

      if (DEBUG) {
        let modelName = this.modelName;
        assert(`There is no ${kind} relationship named '${name}' on a model of modelClass '${modelName}'`, relationship);

        let actualRelationshipKind = relationship.relationshipMeta.kind;
        assert(`You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`, actualRelationshipKind === kind);
      }

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

if (isEnabled('ds-rollback-attribute')) {
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
