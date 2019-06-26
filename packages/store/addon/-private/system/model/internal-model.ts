import { set, get } from '@ember/object';
import EmberError from '@ember/error';
import { default as EmberArray, A } from '@ember/array';
import { run } from '@ember/runloop';
import { assign } from '@ember/polyfills';
import RSVP, { Promise, resolve } from 'rsvp';
import Ember from 'ember';
import { DEBUG } from '@glimmer/env';
import { assert, inspect } from '@ember/debug';
import RootState from './states';
import Snapshot from '../snapshot';
import OrderedSet from '../ordered-set';
import ManyArray from '../many-array';
import { PromiseBelongsTo, PromiseManyArray } from '../promise-proxies';
import Store from '../store';

import { RecordReference, BelongsToReference, HasManyReference } from '../references';
import { default as recordDataFor, relationshipStateFor } from '../record-data-for';
import RecordData from '../../ts-interfaces/record-data';
import { Record } from '../../ts-interfaces/record';
import { Dict } from '../../types';

// move to TS hacks module that we can delete when this is no longer a necessary recast
type ManyArray = InstanceType<typeof ManyArray>;
type Store = InstanceType<typeof Store>;
type PromiseBelongsTo = InstanceType<typeof PromiseBelongsTo>;
type PromiseManyArray = InstanceType<typeof PromiseManyArray>;

interface BelongsToMetaWrapper {
  key: string;
  store: Store;
  originatingInternalModel: InternalModel;
  modelName: string;
}
import { JsonApiResource, JsonApiValidationError } from '../../ts-interfaces/record-data-json-api';
import { errorsHashToArray, errorsArrayToHash } from '../errors-utils';
import { identifierForIM } from '../record-identifier';
// import RecordDataDefault, { RecordData, JsonApiResource, JsonApiValidationError, JsonApiError, ChangedAttributesHash } from './record-data';

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
  return _splitOnDotCache[name] || (_splitOnDotCache[name] = name.split('.'));
}

function extractPivotName(name) {
  return _extractPivotNameCache[name] || (_extractPivotNameCache[name] = splitOnDot(name)[0]);
}

let InternalModelReferenceId = 1;

/*
  `InternalModel` is the Model class that we use internally inside Ember Data to represent models.
  Internal ED methods should only deal with `InternalModel` objects. It is a fast, plain Javascript class.

  We expose `Model` to application code, by materializing a `Model` from `InternalModel` lazily, as
  a performance optimization.

  `InternalModel` should never be exposed to application code. At the boundaries of the system, in places
  like `find`, `push`, etc. we convert between Models and InternalModels.

  We need to make sure that the properties from `InternalModel` are correctly exposed/proxied on `Model`
  if they are needed.

  @private
  @class InternalModel
*/
export default class InternalModel {
  id: string | null;
  store: Store;
  modelName: string;
  clientId: string | null;
  __recordData: RecordData | null;
  _isDestroyed: boolean;
  isError: boolean;
  _pendingRecordArrayManagerFlush: boolean;
  _isDematerializing: boolean;
  isReloading: boolean;
  _doNotDestroy: boolean;
  isDestroying: boolean;

  // Not typed yet
  _promiseProxy: any;
  _record: any;
  _scheduledDestroy: any;
  _modelClass: any;
  __deferredTriggers: any;
  __recordArrays: any;
  _references: any;
  _recordReference: any;
  _manyArrayCache: Dict<string, ManyArray> = Object.create(null);

  // The previous ManyArrays for this relationship which will be destroyed when
  // we create a new ManyArray, but in the interim the retained version will be
  // updated if inverse internal models are unloaded.
  _retainedManyArrayCache: Dict<string, ManyArray> = Object.create(null);
  _relationshipPromisesCache: Dict<string, RSVP.Promise<unknown>> = Object.create(null);
  _relationshipProxyCache: Dict<string, PromiseManyArray | PromiseBelongsTo> = Object.create(null);
  currentState: any;
  error: any;

  constructor(modelName: string, id: string | null, store, data, clientId) {
    this.id = id;
    this.store = store;
    this.modelName = modelName;
    this.clientId = clientId;

    this.__recordData = null;

    // this ensure ordered set can quickly identify this as unique
    this[Ember.GUID_KEY] = InternalModelReferenceId++ + 'internal-model';

    this._promiseProxy = null;
    this._record = null;
    this._isDestroyed = false;
    this.isError = false;
    this._pendingRecordArrayManagerFlush = false; // used by the recordArrayManager

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
  }

  get modelClass() {
    return this._modelClass || (this._modelClass = this.store.modelFor(this.modelName));
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

  get _recordData(): RecordData {
    if (this.__recordData === null) {
      let recordData = this.store._createRecordData(this.modelName, this.id, this.clientId, this);
      this._recordData = recordData;
      return recordData;
    }
    return this.__recordData;
  }

  set _recordData(newValue) {
    this.__recordData = newValue;
  }

  get _recordArrays() {
    if (this.__recordArrays === null) {
      this.__recordArrays = new OrderedSet();
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

    return (
      this._isDematerializing ||
      this.hasScheduledDestroy() ||
      this.isDestroyed ||
      this._isRecordFullyDeleted() ||
      //this.currentState.stateName === 'root.deleted.saved' ||
      this.isEmpty()
    );
  }

  _isRecordFullyDeleted() {
    if (this._recordData.isDeletionCommitted) {
      return this._recordData.isDeletionCommitted() || (this._recordData.isNew() && this._recordData.isDeleted());
    } else {
      return this.currentState.stateName === 'root.deleted.saved';
    }
  }

  isRecordInUse() {
    let record = this._record;
    return record && !(record.get('isDestroyed') || record.get('isDestroying'));
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

  /*
  hasDirtyAttributes() {
    return this.currentState.hasDirtyAttributes;
  }

  isSaving() {
    return this.currentState.isSaving;
  }
  */

  isDeleted() {
    //TODO deprecate and use RD directly
    return this._recordData.isDeleted();
    //return this.currentState.isDeleted;
  }

  isNew() {
    //TODO deprecate and use RD directly
    if (this._recordData.isNew) {
      return this._recordData.isNew();
    } else {
      return this.currentState.isNew;
    }
  }

  /*
  isValid() {
    //return this.currentState.isValid;
  }
  */

  dirtyType() {
    //return this.currentState.dirtyType;
  }

  getRecord(properties?) {
    if (!this._record && !this._isDematerializing) {
      let { store } = this;

      this._record = store._instantiateRecord(this, this.modelName, this._recordData, properties);

      this._triggerDeferredTriggers();
    }
    return this._record;
  }

  resetRecord() {
    this._record = null;
    this.isReloading = false;
    this.error = null;
    this.currentState = RootState.empty;
  }

  dematerializeRecord() {
    this._isDematerializing = true;

    // TODO IGOR add a test that fails when this is missing, something that involves canceliing a destroy
    // and the destroy not happening, and then later on trying to destroy
    this._doNotDestroy = false;

    if (this._record) {
      this._record.destroy();

      Object.keys(this._relationshipProxyCache).forEach(key => {
        if (this._relationshipProxyCache[key].destroy) {
          this._relationshipProxyCache[key].destroy();
        }
        delete this._relationshipProxyCache[key];
      });
      Object.keys(this._manyArrayCache).forEach(key => {
        let manyArray = (this._retainedManyArrayCache[key] = this._manyArrayCache[key]);
        delete this._manyArrayCache[key];

        if (manyArray && !manyArray._inverseIsAsync) {
          /*
            If the manyArray is for a sync relationship, we should clear it
              to preserve the semantics of client-side delete.

            It is likely in this case instead of retaining we should destroy
              - @runspired
          */
          manyArray.clear();
        }
      });
    }

    // move to an empty never-loaded state
    this._recordData.unloadRecord();
    this.resetRecord();
    this.updateRecordArrays();
  }

  deleteRecord() {
    if (this._recordData.setIsDeleted) {
      this._recordData.setIsDeleted(true);
    }
    this.send('deleteRecord');
  }

  save(options) {
    return this.store.scheduleSave(this, options);
  }

  startedReloading() {
    /*
    }
    */
  }

  linkWasLoadedForRelationship(key, data) {
    let relationships = {};
    relationships[key] = data;
    this._recordData.pushData({
      id: this.id,
      type: this.modelName,
      relationships,
    });
  }

  finishedReloading() {
  }

  reload(options) {
    if (!options) {
      options = {};
    }
    this.startedReloading();
    let internalModel = this;
    let promiseLabel = 'DS: Model#reload of ' + this;

    return internalModel.store._reloadRecord(internalModel, options)
      .then(
        function () {
          //TODO NOW seems like we shouldn't need to do this
          return internalModel;
        },
        function (error) {
          throw error;
        },
        'DS: Model#reload complete, update flags'
      )
      .finally(function () {
        internalModel.finishedReloading();
        internalModel.updateRecordArrays();
      });
  }

  /*
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
    if (this.isDestroyed) {
      return;
    }
    this.send('unloadRecord');
    this.dematerializeRecord();
    if (this._scheduledDestroy === null) {
      this._scheduledDestroy = run.backburner.schedule(
        'destroy',
        this,
        '_checkForOrphanedInternalModels'
      );
    }
  }

  hasScheduledDestroy() {
    return !!this._scheduledDestroy;
  }

  cancelDestroy() {
    assert(
      `You cannot cancel the destruction of an InternalModel once it has already been destroyed`,
      !this.isDestroyed
    );

    this._doNotDestroy = true;
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
    if (this.isDestroyed || this.isDestroying) {
      return;
    }

    // just in-case we are not one of the orphaned, we should still
    // still destroy ourselves
    this.destroy();
  }

  _checkForOrphanedInternalModels() {
    this._isDematerializing = false;
    this._scheduledDestroy = null;
    if (this.isDestroyed) {
      return;
    }
  }

  eachRelationship(callback, binding) {
    return this.modelClass.eachRelationship(callback, binding);
  }

  _findBelongsTo(key, resource, relationshipMeta, options) {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    return this.store
      ._findBelongsToByJsonApiResource(resource, this, relationshipMeta, options)
      .then(
        internalModel =>
          handleCompletedRelationshipRequest(
            this,
            key,
            resource._relationship,
            internalModel,
            null
          ),
        e => handleCompletedRelationshipRequest(this, key, resource._relationship, null, e)
      );
  }

  getBelongsTo(key, options) {
    let resource = this._recordData.getBelongsTo(key);
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    let store = this.store;
    let parentInternalModel = this;
    let async = relationshipMeta.options.async;
    let isAsync = typeof async === 'undefined' ? true : async;
    let _belongsToState: BelongsToMetaWrapper = {
      key,
      store,
      originatingInternalModel: this,
      modelName: relationshipMeta.type,
    };

    if (isAsync) {
      let internalModel =
        resource && resource.data ? store._internalModelForResource(resource.data) : null;

      if (resource!._relationship!.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key];
      }

      let promise = this._findBelongsTo(key, resource, relationshipMeta, options);

      return this._updatePromiseProxyFor('belongsTo', key, {
        promise,
        content: internalModel ? internalModel.getRecord() : null,
        _belongsToState,
      });
    } else {
      if (!resource || !resource.data) {
        return null;
      } else {
        let internalModel = store._internalModelForResource(resource.data);
        let toReturn = internalModel.getRecord();
        assert(
          "You looked up the '" +
          key +
          "' relationship on a '" +
          parentInternalModel.modelName +
          "' with id " +
          parentInternalModel.id +
          ' but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)',
          toReturn === null || !toReturn.get('isEmpty')
        );
        return toReturn;
      }
    }
  }

  // TODO Igor consider getting rid of initial state
  getManyArray(key, isAsync = false) {
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    let jsonApi = this._recordData.getHasMany(key);
    let manyArray = this._manyArrayCache[key];

    assert(
      `Error: relationship ${this.modelName}:${key} has both many array and retained many array`,
      !manyArray || !this._retainedManyArrayCache[key]
    );

    if (!manyArray) {
      let initialState = this.store._getHasManyByJsonApiResource(jsonApi);
      // TODO move this to a public api
      let inverseIsAsync = jsonApi._relationship ? jsonApi._relationship._inverseIsAsync() : false;
      manyArray = ManyArray.create({
        store: this.store,
        type: this.store.modelFor(relationshipMeta.type),
        recordData: this._recordData,
        meta: jsonApi.meta,
        key,
        isPolymorphic: relationshipMeta.options.polymorphic,
        initialState: initialState.slice(),
        _inverseIsAsync: inverseIsAsync,
        internalModel: this,
        isLoaded: !isAsync,
      });
      this._manyArrayCache[key] = manyArray;
    }

    if (this._retainedManyArrayCache[key]) {
      this._retainedManyArrayCache[key].destroy();
      delete this._retainedManyArrayCache[key];
    }

    return manyArray;
  }

  fetchAsyncHasMany(key, relationshipMeta, jsonApi, manyArray, options): RSVP.Promise<unknown> {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    let loadingPromise = this._relationshipPromisesCache[key];
    if (loadingPromise) {
      return loadingPromise;
    }

    loadingPromise = this.store
      ._findHasManyByJsonApiResource(jsonApi, this, relationshipMeta, options)
      .then(initialState => {
        // TODO why don't we do this in the store method
        manyArray.retrieveLatest();
        manyArray.set('isLoaded', true);

        return manyArray;
      })
      .then(
        manyArray =>
          handleCompletedRelationshipRequest(this, key, jsonApi._relationship, manyArray, null),
        e => handleCompletedRelationshipRequest(this, key, jsonApi._relationship, null, e)
      );
    this._relationshipPromisesCache[key] = loadingPromise;
    return loadingPromise;
  }

  getHasMany(key, options) {
    let jsonApi = this._recordData.getHasMany(key);
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    let async = relationshipMeta.options.async;
    let isAsync = typeof async === 'undefined' ? true : async;
    let manyArray = this.getManyArray(key, isAsync);

    if (isAsync) {
      if (jsonApi!._relationship!.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key];
      }

      let promise = this.fetchAsyncHasMany(key, relationshipMeta, jsonApi, manyArray, options);

      return this._updatePromiseProxyFor('hasMany', key, { promise, content: manyArray });
    } else {
      assert(
        `You looked up the '${key}' relationship on a '${this.type.modelName}' with id ${
        this.id
        } but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async ('DS.hasMany({ async: true })')`,
        !manyArray.anyUnloaded()
      );

      return manyArray;
    }
  }

  _updatePromiseProxyFor(
    kind: 'hasMany' | 'belongsTo',
    key: string,
    args: {
      promise: RSVP.Promise<unknown>;
      content?: Record | ManyArray | null;
      _belongsToState?: BelongsToMetaWrapper;
    }
  ) {
    let promiseProxy = this._relationshipProxyCache[key];
    if (promiseProxy) {
      if (args.content !== undefined) {
        // this usage of `any` can be removed when `@types/ember_object` proxy allows `null` for content
        promiseProxy.set('content', args.content as any);
      }
      promiseProxy.set('promise', args.promise);
    } else {
      const klass = kind === 'hasMany' ? PromiseManyArray : PromiseBelongsTo;
      // this usage of `any` can be removed when `@types/ember_object` proxy allows `null` for content
      this._relationshipProxyCache[key] = klass.create(args as any);
    }

    return this._relationshipProxyCache[key];
  }

  reloadHasMany(key, options) {
    let loadingPromise = this._relationshipPromisesCache[key];
    if (loadingPromise) {
      return loadingPromise;
    }

    let jsonApi = this._recordData.getHasMany(key);
    // TODO move this to a public api
    if (jsonApi._relationship) {
      jsonApi._relationship.setHasFailedLoadAttempt(false);
      jsonApi._relationship.setShouldForceReload(true);
    }
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    let manyArray = this.getManyArray(key);
    let promise = this.fetchAsyncHasMany(key, relationshipMeta, jsonApi, manyArray, options);

    if (this._relationshipProxyCache[key]) {
      return this._updatePromiseProxyFor('hasMany', key, { promise });
    }

    return promise;
  }

  reloadBelongsTo(key, options) {
    let loadingPromise = this._relationshipPromisesCache[key];
    if (loadingPromise) {
      return loadingPromise;
    }

    let resource = this._recordData.getBelongsTo(key);
    // TODO move this to a public api
    if (resource._relationship) {
      resource._relationship.setHasFailedLoadAttempt(false);
      resource._relationship.setShouldForceReload(true);
    }
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    let promise = this._findBelongsTo(key, resource, relationshipMeta, options);
    if (this._relationshipProxyCache[key]) {
      return this._updatePromiseProxyFor('belongsTo', key, { promise });
    }
    return promise;
  }

  destroyFromRecordData() {
    if (this._doNotDestroy) {
      this._doNotDestroy = false;
      return;
    }
    this.destroy();
  }

  destroy() {
    // TODO add a better check for ED model
    assert(
      'Cannot destroy an internalModel while its record is materialized',
      !this._record || (this._record.get && this._record.get('isDestroyed')) || (this._record.get && this._record.get('isDestroying'))
    );
    this.isDestroying = true;
    Object.keys(this._retainedManyArrayCache).forEach(key => {
      this._retainedManyArrayCache[key].destroy();
      delete this._retainedManyArrayCache[key];
    });

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
    let changedKeys = this._recordData.pushData(data, this.hasRecord);
    if (this.hasRecord) {
      this._record._notifyProperties(changedKeys);
    }
    this.pushedData();
  }

  getAttributeValue(key) {
    return this._recordData.getAttr(key);
  }

  setDirtyHasMany(key, records) {
    assertRecordsPassedToHasMany(records);
    return this._recordData.setDirtyHasMany(key, extractRecordDatasFromRecords(records));
  }

  setDirtyBelongsTo(key, value) {
    return this._recordData.setDirtyBelongsTo(key, extractRecordDataFromRecord(value));
  }

  setDirtyAttribute(key, value) {
    if (this.isDeleted()) {
      throw new EmberError(`Attempted to set '${key}' to '${value}' on the deleted record ${this}`);
    }

    let currentValue = this.getAttributeValue(key);
    if (currentValue !== value) {
      this._recordData.setDirtyAttribute(key, value);
      let isDirty = this._recordData.isAttrDirty(key);
      this.send('didSetProperty', {
        name: key,
        isDirty: isDirty,
      });
    }

    return value;
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
    return new Snapshot(options, identifierForIM(this), this.store);
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

  hasChangedAttributes() {
    if (this.isLoading() && !this.isReloading) {
      // no need to instantiate _recordData in this case
      return false;
    }
    return this._recordData.hasChangedAttributes();
  }

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes(): ChangedAttributesHash {
    if (this.isLoading() && !this.isReloading) {
      // no need to calculate changed attributes when calling `findRecord`
      return {};
    }
    return this._recordData.changedAttributes();
  }

  /*
    @method adapterWillCommit
    @private
  */
  adapterWillCommit() {
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
  send(name, context?) {
    let currentState = this.currentState;

    if (!currentState[name]) {
      this._unhandledEvent(currentState, name, context);
    }

    return currentState[name](this, context);
  }

  manyArrayRecordAdded(key) {
    if (this.hasRecord) {
      this._record.notifyHasManyAdded(key);
    }
  }

  notifyHasManyChange(key, record, idx) {
    if (this.hasRecord) {
      let manyArray = this._manyArrayCache[key];
      if (manyArray) {
        // TODO: this will "resurrect" previously unloaded records
        // see test '1:many async unload many side'
        //  in `tests/integration/records/unload-test.js`
        //  probably we don't want to retrieve latest eagerly when notifyhasmany changed
        //  but rather lazily when someone actually asks for a manyarray
        //
        //  that said, also not clear why we haven't moved this to retainedmanyarray so maybe that's the bit that's just not workign
        manyArray.retrieveLatest();
      }
      this.updateRecordArrays();
    }
  }

  notifyBelongsToChange(key, record) {
    if (this.hasRecord) {
      this._record.notifyBelongsToChange(key, record);
      this.updateRecordArrays();
    }
  }

  //TODO NOW have to disentangle hasMany handling from change notifying
  notifyPropertyChange(key) {
    if (this.hasRecord) {
      this._record.notifyPropertyChange(key);
      this.updateRecordArrays();
    }
    let manyArray = this._manyArrayCache[key] || this._retainedManyArrayCache[key];
    if (manyArray) {
      let didRemoveUnloadedModel = manyArray.removeUnloadedInternalModel();

      if (this._manyArrayCache[key] && didRemoveUnloadedModel) {
        this._retainedManyArrayCache[key] = this._manyArrayCache[key];
        delete this._manyArrayCache[key];
      }
    }
  }

  didCreateRecord() {
    this._recordData.clientDidCreate();
  }

  rollbackAttributes() {
    let dirtyKeys = this._recordData.rollbackAttributes();

    this.send('rolledBack');

    if (this._record && dirtyKeys && dirtyKeys.length > 0) {
      this._record._notifyProperties(dirtyKeys);
    }
  }

  /*
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo(name) {
    // POSSIBLE TODO: Remove this code and replace with
    // always having direct reference to state objects

    let pivotName = extractPivotName(name);
    let state = this.currentState;
    let transitionMapId = `${state.stateName}->${name}`;

    do {
      if (state.exit) {
        state.exit(this);
      }
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

        if (state.enter) {
          enters.push(state);
        }
        if (state.setup) {
          setups.push(state);
        }
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
    let errorMessage = 'Attempted to handle event `' + name + '` ';
    errorMessage += 'on ' + String(this) + ' while in state ';
    errorMessage += state.stateName + '. ';

    if (context !== undefined) {
      errorMessage += 'Called with ' + inspect(context) + '.';
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
    //TODO: Before 1.0 we want to remove all the events that happen on the pre materialized record,
    //but for now, we queue up all the events triggered before the record was materialized, and flush
    //them once we have the record
    if (!this.hasRecord) {
      return;
    }
    let triggers = this._deferredTriggers;
    let record = this._record;
    let trigger = record.trigger;
    for (let i = 0, l = triggers.length; i < l; i++) {
      trigger.apply(record, triggers[i]);
    }

    triggers.length = 0;
  }

  removeFromInverseRelationships(isNew = false) {
    this._recordData.removeFromInverseRelationships(isNew);
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
    let jsonPayload: JsonApiResource = {};
    //TODO(Igor) consider the polymorphic case
    Object.keys(preload).forEach(key => {
      let preloadValue = get(preload, key);
      let relationshipMeta = this.modelClass.metaForProperty(key);
      if (relationshipMeta.isRelationship) {
        if (!jsonPayload.relationships) {
          jsonPayload.relationships = {};
        }
        jsonPayload.relationships[key] = this._preloadRelationship(key, preloadValue);
      } else {
        if (!jsonPayload.attributes) {
          jsonPayload.attributes = {};
        }
        jsonPayload.attributes[key] = preloadValue;
      }
    });
    this._recordData.pushData(jsonPayload);
  }

  _preloadRelationship(key, preloadValue) {
    let relationshipMeta = this.modelClass.metaForProperty(key);
    let modelClass = relationshipMeta.type;
    let data;
    if (relationshipMeta.kind === 'hasMany') {
      assert(
        'You need to pass in an array to set a hasMany property on a record',
        Array.isArray(preloadValue)
      );
      data = preloadValue.map(value => this._convertPreloadRelationshipToJSON(value, modelClass));
    } else {
      data = this._convertPreloadRelationshipToJSON(preloadValue, modelClass);
    }
    return { data };
  }

  _convertPreloadRelationshipToJSON(value, modelClass) {
    if (typeof value === 'string' || typeof value === 'number') {
      return { type: modelClass, id: value };
    }
    let internalModel;
    if (value._internalModel) {
      internalModel = value._internalModel;
    } else {
      internalModel = value;
    }
    // TODO IGOR DAVID assert if no id is present
    return { type: internalModel.modelName, id: internalModel.id };
  }

  /*
    Used to notify the store to update FilteredRecordArray membership.

    @method updateRecordArrays
    @private
  */
  updateRecordArrays() {
    // @ts-ignore: Store is untyped and typescript does not detect instance props set in `init`
    this.store.recordArrayManager.recordDidChange(this);
  }

  setId(id) {
    assert(
      "A record's id cannot be changed once it is in the loaded state",
      this.id === null || this.id === id || this.isNew()
    );
    let didChange = id !== this.id;

    this.id = id;

    if (didChange && id !== null) {
      this.store._setRecordId(this, id, this.clientId);
    }

    if (didChange && this.hasRecord) {
      this._record.notifyPropertyChange('id');
    }
  }

  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.

    @method adapterDidCommit
  */
  adapterDidCommit(data) {
    let changedKeys = this._recordData.didCommit(data);

    this.send('didCommit');
    this.updateRecordArrays();

    if (!data) {
      return;
    }

    this._record._notifyProperties(changedKeys);
  }

  hasErrors() {
    return this._recordData.getErrors().length > 0;
  }

  // FOR USE DURING COMMIT PROCESS

  /*
    @method adapterDidInvalidate
    @private
  */
  adapterDidInvalidate(error, parsedErrors) {
    let attribute;
    if (error && parsedErrors) {
      let jsonApiErrors: JsonApiValidationError[] = errorsHashToArray(parsedErrors);
      this.send('becameInvalid');
      if (jsonApiErrors.length === 0) {
        jsonApiErrors = [{ title: 'Invalid Error', detail: '' , source: { pointer: '/data' } }];
      }
      this._recordData.commitWasRejected({}, jsonApiErrors);
    } else {
      this.send('becameError');
      this._recordData.commitWasRejected({});
    }
  }

  notifyErrorsChange() {
    let jsonApiErrors = this._recordData.getErrors() || [];
    // TODO NOW tighten this check
    // don't think we need this
    let invalidErrors: JsonApiValidationError[] = jsonApiErrors.filter((err) => err.source !== undefined && err.title !== undefined) as JsonApiValidationError[];
    this.notifyInvalidErrorsChange(invalidErrors);
  }

  notifyInvalidErrorsChange(jsonApiErrors: JsonApiValidationError[]) {
    this.getRecord().invalidErrorsChanged(jsonApiErrors);
  }

  notifyStateChange(key?) {
    if (this.hasRecord) {
      if (!key || key === 'isNew') {
        this.getRecord().notifyPropertyChange('isNew');
      }
      if (!key || key === 'isDeleted') {
        this.getRecord().notifyPropertyChange('isDeleted');
      }
    }
    if (!key || key === 'isDeletionCommitted') {
      this.updateRecordArrays();
    }
  }
  /*
    @method adapterror
    @private
  adapterDidError(error) {
    this.send('becameError');

    if (error === undefined) {
      error = null;
    }
    // TODO NOW this is kinda a crapshot
    let jsonError = { meta: error };
    this._recordData.commitWasRejected([jsonError]);
  }
  */

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }

  referenceFor(kind, name) {
    let reference = this.references[name];

    if (!reference) {
      // TODO IGOR AND DAVID REFACTOR
      let relationship = relationshipStateFor(this, name);

      if (DEBUG) {
        let modelName = this.modelName;
        assert(
          `There is no ${kind} relationship named '${name}' on a model of modelClass '${modelName}'`,
          relationship
        );

        let actualRelationshipKind = relationship.relationshipMeta.kind;
        assert(
          `You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`,
          actualRelationshipKind === kind
        );
      }

      if (kind === 'belongsTo') {
        reference = new BelongsToReference(this.store, this, relationship, name);
      } else if (kind === 'hasMany') {
        reference = new HasManyReference(this.store, this, relationship, name);
      }

      this.references[name] = reference;
    }

    return reference;
  }
}

function handleCompletedRelationshipRequest(internalModel, key, relationship, value, error) {
  delete internalModel._relationshipPromisesCache[key];
  relationship.setShouldForceReload(false);

  if (error) {
    relationship.setHasFailedLoadAttempt(true);
    let proxy = internalModel._relationshipProxyCache[key];
    // belongsTo relationships are sometimes unloaded
    // when a load fails, in this case we need
    // to make sure that we aren't proxying
    // to destroyed content
    // for the sync belongsTo reload case there will be no proxy
    // for the async reload case there will be no proxy if the ui
    // has never been accessed
    if (proxy && relationship.kind === 'belongsTo') {
      if (proxy.content.isDestroying) {
        proxy.set('content', null);
      }

      // clear the promise to make re-access safe
      // e.g. after initial rejection, don't replay
      // rejection on subsequent access, otherwise
      // templates cause lots of rejected promise blow-ups
      proxy.set('promise', resolve(null));
    }

    throw error;
  }

  relationship.setHasFailedLoadAttempt(false);
  // only set to not stale if no error is thrown
  relationship.setRelationshipIsStale(false);

  return value;
}

function assertRecordsPassedToHasMany(records) {
  // TODO only allow native arrays
  assert(
    `You must pass an array of records to set a hasMany relationship`,
    Array.isArray(records) || EmberArray.detect(records)
  );
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed ${inspect(
      records
    )}`,
    (function () {
      return A(records).every(record => record.hasOwnProperty('_internalModel') === true);
    })()
  );
}

function extractRecordDatasFromRecords(records) {
  return records.map(extractRecordDataFromRecord);
}

function extractRecordDataFromRecord(recordOrPromiseRecord) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (recordOrPromiseRecord.then) {
    let content = recordOrPromiseRecord.get && recordOrPromiseRecord.get('content');
    assert(
      'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.',
      content !== undefined
    );
    return content ? recordDataFor(content) : null;
  }

  return recordDataFor(recordOrPromiseRecord);
}
