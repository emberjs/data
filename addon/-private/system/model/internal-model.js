import { assign, merge } from '@ember/polyfills';
import { set, get } from '@ember/object';
import EmberError from '@ember/error';
import { isEmpty } from '@ember/utils';
import { setOwner } from '@ember/application';
import { run } from '@ember/runloop';
import RSVP, { Promise } from 'rsvp';
import Ember from 'ember';
import { DEBUG } from '@glimmer/env';
import { assert, inspect } from '@ember/debug';
import RootState from "./states";
import Snapshot from "../snapshot";
import OrderedSet from "../ordered-set";

import { getOwner } from '../../utils';

import {
  RecordReference,
  BelongsToReference,
  HasManyReference
} from "../references";

const emberAssign = assign || merge;

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
    this.store = store;
    this.modelName = modelName;

    let ModelDataClass = this.store.modelDataClassFor(modelName, id);

    this._modelData = new ModelDataClass(modelName, id, store, data, this);
    // this ensure ordered set can quickly identify this as unique
    this[Ember.GUID_KEY] = InternalModelReferenceId++ + 'internal-model';

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

    // caches for lazy getters
    this._modelClass = null;
    this.__deferredTriggers = null;
    this.__recordArrays = null;
    this._references = null;
    this._recordReference = null;

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

  getRecord(properties) {
    if (!this._record && !this._isDematerializing) {
      heimdall.increment(materializeRecord);
      let token = heimdall.start('InternalModel.getRecord');

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

      if (typeof properties === 'object' && properties !== null) {
        emberAssign(createOptions, properties);
      }

      if (setOwner) {
        // ensure that `getOwner(this)` works inside a model instance
        setOwner(createOptions, getOwner(this.store));
      } else {
        createOptions.container = this.store.container;
      }

      this._record = this.store.modelFactoryFor(this.modelName).create(createOptions);

      this._triggerDeferredTriggers();
      heimdall.stop(token);
    }

    return this._record;
  }

  resetRecord() {
    this._record = null;
    this.isReloading = false;
    this.error = null;
    this.currentState = RootState.empty;
    this._modelData.resetRecord();
  }

  dematerializeRecord() {
    if (this._record) {
      this._isDematerializing = true;
      this._record.destroy();
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

  startedReloading() {
    this.isReloading = true;
    if (this.hasRecord) {
      set(this._record, 'isReloading', true);
    }
  }

  finishedReloading() {
    this.isReloading = false;
    if (this.hasRecord) {
      set(this._record, 'isReloading', false);
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

  /**
    Computes the set of internal models reachable from `this` across exactly one
    relationship.

    @return {Array} An array containing the internal models that `this` belongs
    to or has many.
  */
  _directlyRelatedInternalModels() {
    let array = [];
    // IGOR AND DAVID REFACTOR

    this._modelData._relationships.forEach((name, rel) => {
      array = array.concat(rel.members.list, rel.canonicalMembers.list);
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
  unloadRecord() {
    if (this.isDestroyed) { return; }
    this.send('unloadRecord');
    this.dematerializeRecord();

    if (this._scheduledDestroy === null) {
      // TODO: use run.schedule once we drop 1.13
      if (!run.currentRunLoop) {
        assert('You have turned on testing mode, which disabled the run-loop\'s autorun.\n                  You will need to wrap any code with asynchronous side-effects in a run', Ember.testing);
      }
      this._scheduledDestroy = run.backburner.schedule('destroy', this, '_checkForOrphanedInternalModels')
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

  pushRelationshipData(key, data) {
    this._modelData.pushRelationshipData(key, data);
  }

  getBelongsTo(key) {
    return this._modelData.getBelongsTo(key);
  }

  setBelongsTo(key, value) {
    return this._modelData.setBelongsTo(key, value);
  }

  getHasMany(key) {
    return this._modelData.getHasMany(key);
  }

  setHasMany(key, value) {
    this._modelData.setHasMany(key, value);
  }

  destroy() {
    assert("Cannot destroy an internalModel while its record is materialized", !this._record || this._record.get('isDestroyed') || this._record.get('isDestroying'));

    // IGOR AND DAVID REFACTOR
    this._modelData._relationships.forEach((name, rel) => rel.destroy());

    this.store._removeFromIdMap(this);
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
    let changedKeys = this._modelData.setupData(data, this.hasRecord);
    if (this.hasRecord) {
      this._record._notifyProperties(changedKeys);
    }
    this.pushedData();
  }

  get isDestroyed() {
    return this._isDestroyed;
  }

  get hasRecord() {
    return !!this._record;
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
    this._modelData.flushChangedAttributes();
  }

  hasChangedAttributes() {
    heimdall.increment(hasChangedAttributes);
    return this._modelData.hasChangedAttributes();
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
    this._modelData.updateChangedAttributes();
  }

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
    heimdall.increment(changedAttributes);
    return this._modelData.changedAttributes();
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
      this._record.notifyHasManyAdded(key, record, idx);
    }
  }

  notifyBelongsToChanged(key, record) {
    if (this.hasRecord) {
      this._record.notifyBelongsToChanged(key, record);
    }
  }

  notifyPropertyChange(key) {
    if (this.hasRecord) {
      this._record.notifyPropertyChange(key);
    }
  }

  didCreateRecord(properties) {
    this._modelData.didCreateLocally(properties);
  }

  rollbackAttributes() {
    let dirtyKeys = this._modelData.rollbackAttributes();
    this.send('rolledBack');

    if (dirtyKeys && dirtyKeys.length > 0) {
      this._record._notifyProperties(dirtyKeys);
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
      set(this._record, 'currentState', state);
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
    heimdall.increment(_triggerDeferredTriggers);
    //TODO: Before 1.0 we want to remove all the events that happen on the pre materialized record,
    //but for now, we queue up all the events triggered before the record was materialized, and flush
    //them once we have the record
    if (!this.hasRecord) {
      return;
    }
    let triggers = this._deferredTriggers;
    let record = this._record;
    let trigger = record.trigger;
    for (let i = 0, l= triggers.length; i<l; i++) {
      trigger.apply(record, triggers[i]);
    }

    triggers.length = 0;
  }

  removeFromInverseRelationships(isNew = false) {
    this._modelData.removeFromInverseRelationships(isNew);
  }

  /*
    Notify all inverses that this internalModel has been dematerialized
    and destroys any ManyArrays.
   */
  destroyRelationships() {
    this._modelData.destroyRelationships();
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
    this._modelData.preloadData(preload);
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
    if (this._record.get('id') !== id) {
      this._record.set('id', id);
    }
  }

  didError(error) {
    this.error = error;
    this.isError = true;

    if (this.hasRecord) {
      this._record.setProperties({
        isError: true,
        adapterError: error
      });
    }
  }

  didCleanError() {
    this.error = null;
    this.isError = false;

    if (this.hasRecord) {
      this._record.setProperties({
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
    this.didCleanError();

    let changedKeys = this._modelData.adapterDidCommit(data);

    this.send('didCommit');
    this.updateRecordArrays();

    if (!data) { return; }

    this._record._notifyProperties(changedKeys);
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

    this._modelData.saveWasRejected();
  }

  /*
    @method adapterDidError
    @private
  */
  adapterDidError(error) {
    this.send('becameError');
    this.didError(error);
    this._modelData.saveWasRejected();
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }

  referenceFor(kind, name) {
    let reference = this.references[name];

    if (!reference) {
      // TODO IGOR AND DAVID REFACTOR
      let relationship = this._modelData._relationships.get(name);

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
