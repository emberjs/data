import { A, default as EmberArray } from '@ember/array';
import { assert, inspect } from '@ember/debug';
import EmberError from '@ember/error';
import { get } from '@ember/object';
import { _backburner as emberBackburner, cancel, run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import RSVP, { Promise } from 'rsvp';

import { HAS_MODEL_PACKAGE, HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import type {
  BelongsToRelationship,
  ManyRelationship,
  RecordData as DefaultRecordData,
} from '@ember-data/record-data/-private';
import type { UpgradedMeta } from '@ember-data/record-data/-private/graph/-edge-definition';

import { DSModel } from '../../ts-interfaces/ds-model';
import type { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import type { RecordData } from '../../ts-interfaces/record-data';
import type { JsonApiResource, JsonApiValidationError } from '../../ts-interfaces/record-data-json-api';
import type { RecordInstance } from '../../ts-interfaces/record-instance';
import type { FindOptions } from '../../ts-interfaces/store';
import type { ConfidentDict } from '../../ts-interfaces/utils';
import type CoreStore from '../core-store';
import type Store from '../ds-model-store';
import { errorsHashToArray } from '../errors-utils';
import recordDataFor from '../record-data-for';
import { BelongsToReference, HasManyReference, RecordReference } from '../references';
import Snapshot from '../snapshot';
import { internalModelFactoryFor } from '../store/internal-model-factory';
import RootState from './states';

// move to TS hacks module that we can delete when this is no longer a necessary recast
type ManyArray = InstanceType<typeof import('@ember-data/model/-private').ManyArray>;
type PromiseBelongsTo = InstanceType<typeof import('@ember-data/model/-private').PromiseBelongsTo>;
type PromiseManyArray = InstanceType<typeof import('@ember-data/model/-private').PromiseManyArray>;

/**
  @module @ember-data/store
*/

const { hasOwnProperty } = Object.prototype;

let ManyArray: ManyArray;
let PromiseBelongsTo: PromiseBelongsTo;
let _PromiseManyArray: any; // TODO find a way to get the klass type here

let _found = false;
let _getModelPackage: () => boolean;
if (HAS_MODEL_PACKAGE) {
  _getModelPackage = function () {
    if (!_found) {
      let modelPackage = require('@ember-data/model/-private');
      ({ ManyArray, PromiseBelongsTo, PromiseManyArray: _PromiseManyArray } = modelPackage);
      if (ManyArray && PromiseBelongsTo && _PromiseManyArray) {
        _found = true;
      }
    }
    return _found;
  };
}

interface BelongsToMetaWrapper {
  key: string;
  store: CoreStore;
  originatingInternalModel: InternalModel;
  modelName: string;
}

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
export default class InternalModel {
  declare _id: string | null;
  declare modelName: string;
  declare clientId: string;
  declare __recordData: RecordData | null;
  declare _isDestroyed: boolean;
  declare isError: boolean;
  declare _pendingRecordArrayManagerFlush: boolean;
  declare _isDematerializing: boolean;
  declare _doNotDestroy: boolean;
  declare isDestroying: boolean;
  declare _isUpdatingId: boolean;
  declare _deletedRecordWasNew: boolean;

  // Not typed yet
  declare _promiseProxy: any;
  declare _record: any;
  declare _scheduledDestroy: any;
  declare _modelClass: any;
  declare _deferredTriggers: any;
  declare __recordArrays: any;
  declare references: any;
  declare _recordReference: RecordReference;
  declare _manyArrayCache: ConfidentDict<ManyArray>;

  declare _relationshipPromisesCache: ConfidentDict<RSVP.Promise<any>>;
  declare _relationshipProxyCache: ConfidentDict<PromiseManyArray | PromiseBelongsTo>;
  declare error: any;
  declare currentState: any;
  declare _previousState: any;

  constructor(public store: CoreStore | Store, public identifier: StableRecordIdentifier) {
    if (HAS_MODEL_PACKAGE) {
      _getModelPackage();
    }
    this._id = identifier.id;
    this._isUpdatingId = false;
    this.modelName = identifier.type;
    this.clientId = identifier.lid;

    this.__recordData = null;

    this._promiseProxy = null;
    this._isDestroyed = false;
    this._doNotDestroy = false;
    this.isError = false;
    this._pendingRecordArrayManagerFlush = false; // used by the recordArrayManager

    // During dematerialization we don't want to rematerialize the record.  The
    // reason this might happen is that dematerialization removes records from
    // record arrays,  and Ember arrays will always `objectAt(0)` and
    // `objectAt(len - 1)` to test whether or not `firstObject` or `lastObject`
    // have changed.
    this._isDematerializing = false;
    this._scheduledDestroy = null;

    this._record = null;
    this.error = null;

    // caches for lazy getters
    this._modelClass = null;
    this.__recordArrays = null;
    this._recordReference = null;
    this.__recordData = null;

    this.error = null;

    // other caches
    // class fields have [[DEFINE]] semantics which are significantly slower than [[SET]] semantics here
    this._manyArrayCache = Object.create(null);
    this._relationshipPromisesCache = Object.create(null);
    this._relationshipProxyCache = Object.create(null);
    this.references = Object.create(null);
    this._deferredTriggers = [];
    this.currentState = RootState.empty;
  }

  get id(): string | null {
    return this.identifier.id;
  }
  set id(value: string | null) {
    if (value !== this._id) {
      let newIdentifier = { type: this.identifier.type, lid: this.identifier.lid, id: value };
      this.store.identifierCache.updateRecordIdentifier(this.identifier, newIdentifier);
      this.notifyPropertyChange('id');
    }
  }

  get modelClass() {
    if (this.store.modelFor) {
      return this._modelClass || (this._modelClass = this.store.modelFor(this.modelName));
    }
  }

  get recordReference(): RecordReference {
    if (this._recordReference === null) {
      this._recordReference = new RecordReference(this.store, this.identifier);
    }
    return this._recordReference;
  }

  get _recordData(): RecordData {
    if (this.__recordData === null) {
      let recordData = this.store._createRecordData(this.identifier);
      this.__recordData = recordData;
      return recordData;
    }
    return this.__recordData;
  }

  set _recordData(newValue) {
    this.__recordData = newValue;
  }

  isHiddenFromRecordArrays() {
    // During dematerialization we don't want to rematerialize the record.
    // recordWasDeleted can cause other records to rematerialize because it
    // removes the internal model from the array and Ember arrays will always
    // `objectAt(0)` and `objectAt(len -1)` to check whether `firstObject` or
    // `lastObject` have changed.  When this happens we don't want those
    // models to rematerialize their records.

    // eager checks to avoid instantiating record data if we are empty or loading
    if (this.currentState.isEmpty) {
      return true;
    }

    if (this.currentState.isLoading) {
      return false;
    }

    let isRecordFullyDeleted = this._isRecordFullyDeleted();
    return this._isDematerializing || this.hasScheduledDestroy() || this.isDestroyed || isRecordFullyDeleted;
  }

  _isRecordFullyDeleted(): boolean {
    if (this._recordData.isDeletionCommitted && this._recordData.isDeletionCommitted()) {
      return true;
    } else if (
      this._recordData.isNew &&
      this._recordData.isDeleted &&
      this._recordData.isNew() &&
      this._recordData.isDeleted()
    ) {
      return true;
    } else {
      return this.currentState.stateName === 'root.deleted.saved';
    }
  }

  isDeleted() {
    if (this._recordData.isDeleted) {
      return this._recordData.isDeleted();
    } else {
      return this.currentState.isDeleted;
    }
  }

  isNew() {
    if (this._recordData.isNew) {
      return this._recordData.isNew();
    } else {
      return this.currentState.isNew;
    }
  }

  getRecord(properties?): Object {
    if (!this._record && !this._isDematerializing) {
      let { store } = this;

      this._record = store._instantiateRecord(this, this.modelName, this._recordData, this.identifier, properties);
      this._triggerDeferredTriggers();
    }

    return this._record;
  }

  dematerializeRecord() {
    this._isDematerializing = true;

    // TODO IGOR add a test that fails when this is missing, something that involves canceling a destroy
    // and the destroy not happening, and then later on trying to destroy
    this._doNotDestroy = false;
    // this has to occur before the internal model is removed
    // for legacy compat.
    if (this._record) {
      this.store.teardownRecord(this._record);
    }

    // move to an empty never-loaded state
    // ensure any record notifications happen prior to us
    // unseting the record but after we've triggered
    // destroy
    this.store._backburner.join(() => {
      this._recordData.unloadRecord();
    });

    if (this._record) {
      Object.keys(this._relationshipProxyCache).forEach((key) => {
        if (this._relationshipProxyCache[key].destroy) {
          this._relationshipProxyCache[key].destroy();
        }
        delete this._relationshipProxyCache[key];
      });
    }

    this._record = null;
    this.error = null;
    this._previousState = this.currentState;
    this.currentState = RootState.empty;
    this.store.recordArrayManager.recordDidChange(this.identifier);
  }

  deleteRecord() {
    run(() => {
      const backburner = this.store._backburner;
      backburner.run(() => {
        if (this._recordData.setIsDeleted) {
          this._recordData.setIsDeleted(true);
        }

        if (this.isNew()) {
          // destroyRecord follows up deleteRecord with save(). This prevents an unecessary save for a new record
          this._deletedRecordWasNew = true;
          this.send('deleteRecord');
          this._triggerDeferredTriggers();
          this.unloadRecord();
        } else {
          this.send('deleteRecord');
        }
      });
    });
  }

  save(options): Promise<void> {
    if (this._deletedRecordWasNew) {
      return Promise.resolve();
    }
    let promiseLabel = 'DS: Model#save ' + this;
    let resolver = RSVP.defer<void>(promiseLabel);

    // Casting to promise to narrow due to the feature flag paths inside scheduleSave
    return this.store.scheduleSave(this, resolver, options) as Promise<void>;
  }

  reload(options) {
    if (!options) {
      options = {};
    }
    let internalModel = this;

    return internalModel.store._reloadRecord(internalModel, options).then(
      function () {
        //TODO NOW seems like we shouldn't need to do this
        return internalModel;
      },
      function (error) {
        throw error;
      },
      'DS: Model#reload complete, update flags'
    );
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
      this._scheduledDestroy = emberBackburner.schedule('destroy', this, '_checkForOrphanedInternalModels');
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
    cancel(this._scheduledDestroy);
    this._scheduledDestroy = null;
  }

  // typically, we prefer to async destroy this lets us batch cleanup work.
  // Unfortunately, some scenarios where that is not possible. Such as:
  //
  // ```js
  // const record = store.findRecord(‘record’, 1);
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

  _findBelongsTo(key, resource, relationshipMeta, options) {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    return this.store._findBelongsToByJsonApiResource(resource, this, relationshipMeta, options).then(
      (internalModel) => handleCompletedRelationshipRequest(this, key, resource._relationship, internalModel, null),
      (e) => handleCompletedRelationshipRequest(this, key, resource._relationship, null, e)
    );
  }

  getBelongsTo(key, options) {
    let resource = (this._recordData as DefaultRecordData).getBelongsTo(key);
    let identifier =
      resource && resource.data ? this.store.identifierCache.getOrCreateRecordIdentifier(resource.data) : null;
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    if (!relationshipMeta) return;

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
      let internalModel = identifier !== null ? store._internalModelForResource(identifier) : null;

      if (resource._relationship.state.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key];
      }

      let promise = this._findBelongsTo(key, resource, relationshipMeta, options);

      return this._updatePromiseProxyFor('belongsTo', key, {
        promise,
        content: internalModel ? internalModel.getRecord() : null,
        _belongsToState,
      });
    } else {
      if (identifier === null) {
        return null;
      } else {
        let internalModel = store._internalModelForResource(identifier);
        let toReturn = internalModel.getRecord();
        assert(
          "You looked up the '" +
            key +
            "' relationship on a '" +
            parentInternalModel.modelName +
            "' with id " +
            parentInternalModel.id +
            ' but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`belongsTo({ async: true })`)',
          toReturn === null || !(toReturn as DSModel).isEmpty
        );
        return toReturn;
      }
    }
  }

  getManyArray(key: string, definition?: UpgradedMeta) {
    if (HAS_RECORD_DATA_PACKAGE) {
      let manyArray = this._manyArrayCache[key];
      if (!definition) {
        const graphFor = require('@ember-data/record-data/-private').graphFor;
        definition = graphFor(this.store).get(this.identifier, key).definition as UpgradedMeta;
      }

      if (!manyArray) {
        manyArray = ManyArray.create({
          store: this.store,
          type: this.store.modelFor(definition.type),
          recordData: this._recordData,
          key,
          isPolymorphic: definition.isPolymorphic,
          isAsync: definition.isAsync,
          _inverseIsAsync: definition.inverseIsAsync,
          internalModel: this,
          isLoaded: !definition.isAsync,
        });
        this._manyArrayCache[key] = manyArray;
      }

      return manyArray;
    }
    assert(`hasMany only works with the @ember-data/record-data package`, HAS_RECORD_DATA_PACKAGE);
  }

  fetchAsyncHasMany(
    key: string,
    relationship: ManyRelationship | BelongsToRelationship,
    manyArray,
    options
  ): RSVP.Promise<unknown> {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key];
      if (loadingPromise) {
        return loadingPromise;
      }

      const jsonApi = this._recordData.getHasMany(key);

      loadingPromise = this.store._findHasManyByJsonApiResource(jsonApi, this, relationship, options).then(
        () => handleCompletedRelationshipRequest(this, key, relationship, manyArray, null),
        (e) => handleCompletedRelationshipRequest(this, key, relationship, manyArray, e)
      );
      this._relationshipPromisesCache[key] = loadingPromise;
      return loadingPromise;
    }
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  getHasMany(key: string, options?) {
    if (HAS_RECORD_DATA_PACKAGE) {
      const graphFor = require('@ember-data/record-data/-private').graphFor;
      const relationship = graphFor(this.store).get(this.identifier, key);
      const { definition, state } = relationship;
      let manyArray = this.getManyArray(key, definition);

      if (definition.isAsync) {
        if (state.hasFailedLoadAttempt) {
          return this._relationshipProxyCache[key];
        }

        let promise = this.fetchAsyncHasMany(key, relationship, manyArray, options);

        return this._updatePromiseProxyFor('hasMany', key, { promise, content: manyArray });
      } else {
        assert(
          `You looked up the '${key}' relationship on a '${this.modelName}' with id ${this.id} but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async ('hasMany({ async: true })')`,
          !anyUnloaded(this.store, relationship)
        );

        return manyArray;
      }
    }
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  _updatePromiseProxyFor(
    kind: 'hasMany' | 'belongsTo',
    key: string,
    args: {
      promise: RSVP.Promise<any>;
      content?: RecordInstance | ManyArray | null;
      _belongsToState?: BelongsToMetaWrapper;
    }
  ) {
    let promiseProxy = this._relationshipProxyCache[key];
    if (kind === 'hasMany') {
      if (promiseProxy) {
        promiseProxy._update(args.promise, args.content);
      } else {
        promiseProxy = this._relationshipProxyCache[key] = new _PromiseManyArray(args.promise, args.content);
      }
      return promiseProxy;
    }
    if (promiseProxy) {
      if (args.content !== undefined) {
        // this usage of `any` can be removed when `@types/ember_object` proxy allows `null` for content
        promiseProxy.set('content', args.content as any);
      }
      promiseProxy.set('promise', args.promise);
    } else {
      const klass = PromiseBelongsTo;
      // this usage of `any` can be removed when `@types/ember_object` proxy allows `null` for content
      this._relationshipProxyCache[key] = klass.create(args as any);
    }

    return this._relationshipProxyCache[key];
  }

  reloadHasMany(key, options) {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key];
      if (loadingPromise) {
        return loadingPromise;
      }
      const graphFor = require('@ember-data/record-data/-private').graphFor;
      const relationship = graphFor(this.store).get(this.identifier, key);
      const { definition, state } = relationship;

      state.hasFailedLoadAttempt = false;
      state.shouldForceReload = true;
      let manyArray = this.getManyArray(key, definition);
      let promise = this.fetchAsyncHasMany(key, relationship, manyArray, options);

      if (this._relationshipProxyCache[key]) {
        return this._updatePromiseProxyFor('hasMany', key, { promise });
      }

      return promise;
    }
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  reloadBelongsTo(key, options) {
    let loadingPromise = this._relationshipPromisesCache[key];
    if (loadingPromise) {
      return loadingPromise;
    }

    let resource = (this._recordData as DefaultRecordData).getBelongsTo(key);
    // TODO move this to a public api
    if (resource._relationship) {
      resource._relationship.state.hasFailedLoadAttempt = false;
      resource._relationship.state.shouldForceReload = true;
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
    assert(
      'Cannot destroy an internalModel while its record is materialized',
      !this._record || this._record.get('isDestroyed') || this._record.get('isDestroying')
    );
    this.isDestroying = true;
    if (this._recordReference) {
      this._recordReference.destroy();
    }
    this._recordReference = null;
    let cache = this._manyArrayCache;
    Object.keys(cache).forEach((key) => {
      cache[key].destroy();
      delete cache[key];
    });
    if (this.references) {
      cache = this.references;
      Object.keys(cache).forEach((key) => {
        cache[key].destroy();
        delete cache[key];
      });
    }

    internalModelFactoryFor(this.store).remove(this);
    this._isDestroyed = true;
  }

  setupData(data) {
    let changedKeys = this._recordData.pushData(data, this.hasRecord);
    if (this.hasRecord) {
      // TODO @runspired should this be going through the notification manager?
      this._record._notifyProperties(changedKeys);
    }
    this.send('pushedData');
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
      if (DEBUG) {
        throw new EmberError(`Attempted to set '${key}' to '${value}' on the deleted record ${this}`);
      } else {
        throw new EmberError(`Attempted to set '${key}' on the deleted record ${this}`);
      }
    }

    let currentValue = this._recordData.getAttr(key);
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

  createSnapshot(options: FindOptions = {}): Snapshot {
    return new Snapshot(options, this.identifier, this.store);
  }

  hasChangedAttributes() {
    if (!this.__recordData) {
      // no need to calculate changed attributes when calling `findRecord`
      return false;
    }
    return this._recordData.hasChangedAttributes();
  }

  changedAttributes() {
    if (!this.__recordData) {
      // no need to calculate changed attributes when calling `findRecord`
      return {};
    }
    return this._recordData.changedAttributes();
  }

  adapterWillCommit() {
    this._recordData.willCommit();
    this.send('willCommit');
  }

  adapterDidDirty() {
    this.send('becomeDirty');
  }

  send(name, context?) {
    let currentState = this.currentState;

    if (!currentState[name]) {
      this._unhandledEvent(currentState, name, context);
    }

    return currentState[name](this, context);
  }

  notifyHasManyChange(key: string) {
    if (this.hasRecord) {
      let manyArray = this._manyArrayCache[key];
      let hasPromise = !!this._relationshipPromisesCache[key];

      if (manyArray && hasPromise) {
        // do nothing, we will notify the ManyArray directly
        // once the fetch has completed.
        return;
      }

      this.store._notificationManager.notify(this.identifier, 'relationships', key);
    }
  }

  notifyBelongsToChange(key: string) {
    if (this.hasRecord) {
      this.store._notificationManager.notify(this.identifier, 'relationships', key);
    }
  }

  notifyPropertyChange(key) {
    if (this.hasRecord) {
      // TODO this should likely *mostly* be the `attributes` bucket
      // but it seems for local mutations we rely on computed updating
      // iteself when set. As we design our own thing we may need to change
      // that.
      this.store._notificationManager.notify(this.identifier, 'property', key);
    }
  }

  notifyStateChange(key?) {
    if (this.hasRecord) {
      this.store._notificationManager.notify(this.identifier, 'state');
    }
    if (!key || key === 'isDeletionCommitted') {
      this.store.recordArrayManager.recordDidChange(this.identifier);
    }
  }

  didCreateRecord() {
    this._recordData.clientDidCreate();
  }

  rollbackAttributes() {
    this.store._backburner.join(() => {
      let dirtyKeys = this._recordData.rollbackAttributes();
      if (get(this, 'isError')) {
        this.didCleanError();
      }

      this.send('rolledBack');

      if (this._record && dirtyKeys && dirtyKeys.length > 0) {
        this._record._notifyProperties(dirtyKeys);
      }
    });
  }

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
    if (this.hasRecord && typeof this._record.notifyPropertyChange === 'function') {
      // TODO refactor Model to have all flags pull from the notification manager
      // and for currentState.stateName to be constructed from flag state.
      // Probably just port this work from ember-m3
      // After that we can eliminate this.
      this.notifyStateChange('currentState');
      // this._record.notifyPropertyChange('currentState');
    }

    for (i = 0, l = setups.length; i < l; i++) {
      setups[i].setup(this);
    }
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
    // TODO Igor make nicer check
    if (trigger && typeof trigger === 'function') {
      for (let i = 0, l = triggers.length; i < l; i++) {
        let eventName = triggers[i];
        trigger.apply(record, eventName);
      }
    }

    triggers.length = 0;
  }

  removeFromInverseRelationships() {
    if (this.__recordData) {
      this.store._backburner.join(() => {
        this._recordData.removeFromInverseRelationships();
      });
    }
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
  */
  preloadData(preload) {
    let jsonPayload: JsonApiResource = {};
    //TODO(Igor) consider the polymorphic case
    Object.keys(preload).forEach((key) => {
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
      assert('You need to pass in an array to set a hasMany property on a record', Array.isArray(preloadValue));
      data = preloadValue.map((value) => this._convertPreloadRelationshipToJSON(value, modelClass));
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
   * calling `store.setRecordId` is necessary to update
   * the cache index for this record if we have changed.
   *
   * However, since the store is not aware of whether the update
   * is from us (via user set) or from a push of new data
   * it will also call us so that we can notify and update state.
   *
   * When it does so it calls with `fromCache` so that we can
   * short-circuit instead of cycling back.
   *
   * This differs from the short-circuit in the `_isUpdatingId`
   * case in that the the cache can originate the call to setId,
   * so on first entry we will still need to do our own update.
   */
  setId(id: string, fromCache: boolean = false) {
    if (this._isUpdatingId === true) {
      return;
    }
    this._isUpdatingId = true;
    let didChange = id !== this._id;
    this._id = id;

    if (didChange && id !== null) {
      if (!fromCache) {
        this.store.setRecordId(this.modelName, id, this.clientId);
      }
      // internal set of ID to get it to RecordData from DS.Model
      // if we are within create we may not have a recordData yet.
      if (this.__recordData && this._recordData.__setId) {
        this._recordData.__setId(id);
      }
    }

    if (didChange && this.hasRecord) {
      this.store._notificationManager.notify(this.identifier, 'identity');
    }
    this._isUpdatingId = false;
  }

  didError() {}

  didCleanError() {}

  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.
  */
  adapterDidCommit(data) {
    this.didCleanError();

    this._recordData.didCommit(data);
    this.send('didCommit');
    this.store.recordArrayManager.recordDidChange(this.identifier);

    if (!data) {
      return;
    }
    this.store._notificationManager.notify(this.identifier, 'attributes');
  }

  hasErrors() {
    if (this._recordData.getErrors) {
      return this._recordData.getErrors(this.identifier).length > 0;
    } else {
      let errors = (this.getRecord() as DSModel).errors;
      return errors.length > 0;
    }
  }

  // FOR USE DURING COMMIT PROCESS
  adapterDidInvalidate(parsedErrors, error) {
    // TODO @runspired this should be handled by RecordState
    // and errors should be dirtied but lazily fetch if at
    // all possible. We should only notify errors here.
    let attribute;
    if (error && parsedErrors) {
      if (!this._recordData.getErrors) {
        for (attribute in parsedErrors) {
          if (hasOwnProperty.call(parsedErrors, attribute)) {
            (this.getRecord() as DSModel).errors._add(attribute, parsedErrors[attribute]);
          }
        }
      }

      let jsonApiErrors: JsonApiValidationError[] = errorsHashToArray(parsedErrors);
      this.send('becameInvalid');
      if (jsonApiErrors.length === 0) {
        jsonApiErrors = [{ title: 'Invalid Error', detail: '', source: { pointer: '/data' } }];
      }
      this._recordData.commitWasRejected(this.identifier, jsonApiErrors);
    } else {
      this.send('becameError');
      this._recordData.commitWasRejected(this.identifier);
    }
  }

  notifyErrorsChange() {
    this.store._notificationManager.notify(this.identifier, 'errors');
  }

  adapterDidError() {
    this.send('becameError');

    this._recordData.commitWasRejected();
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }

  referenceFor(kind: string | null, name: string) {
    let reference = this.references[name];

    if (!reference) {
      if (!HAS_RECORD_DATA_PACKAGE) {
        // TODO @runspired while this feels odd, it is not a regression in capability because we do
        // not today support references pulling from RecordDatas other than our own
        // because of the intimate API access involved. This is something we will need to redesign.
        assert(`snapshot.belongsTo only supported for @ember-data/record-data`);
      }
      const graphFor = require('@ember-data/record-data/-private').graphFor;
      const relationship = graphFor(this.store._storeWrapper).get(this.identifier, name);

      if (DEBUG && kind) {
        let modelName = this.modelName;
        let actualRelationshipKind = relationship.definition.kind;
        assert(
          `You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`,
          actualRelationshipKind === kind
        );
      }

      let relationshipKind = relationship.definition.kind;
      let identifierOrInternalModel = this.identifier;

      if (relationshipKind === 'belongsTo') {
        reference = new BelongsToReference(this.store, identifierOrInternalModel, relationship, name);
      } else if (relationshipKind === 'hasMany') {
        reference = new HasManyReference(this.store, identifierOrInternalModel, relationship, name);
      }

      this.references[name] = reference;
    }

    return reference;
  }
}

function handleCompletedRelationshipRequest(internalModel, key, relationship, value, error) {
  delete internalModel._relationshipPromisesCache[key];
  relationship.state.shouldForceReload = false;
  const isHasMany = relationship.definition.kind === 'hasMany';

  if (isHasMany) {
    // we don't notify the record property here to avoid refetch
    // only the many array
    value.notify();
  }

  if (error) {
    relationship.state.hasFailedLoadAttempt = true;
    let proxy = internalModel._relationshipProxyCache[key];
    // belongsTo relationships are sometimes unloaded
    // when a load fails, in this case we need
    // to make sure that we aren't proxying
    // to destroyed content
    // for the sync belongsTo reload case there will be no proxy
    // for the async reload case there will be no proxy if the ui
    // has never been accessed
    if (proxy && !isHasMany) {
      if (proxy.content && proxy.content.isDestroying) {
        proxy.set('content', null);
      }
    }

    throw error;
  }

  if (isHasMany) {
    value.set('isLoaded', true);
  }

  relationship.state.hasFailedLoadAttempt = false;
  // only set to not stale if no error is thrown
  relationship.state.isStale = false;

  return value;
}

export function assertRecordsPassedToHasMany(records) {
  // TODO only allow native arrays
  assert(
    `You must pass an array of records to set a hasMany relationship`,
    Array.isArray(records) || EmberArray.detect(records)
  );
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed ${inspect(records)}`,
    (function () {
      return A(records).every((record) => hasOwnProperty.call(record, '_internalModel') === true);
    })()
  );
}

export function extractRecordDatasFromRecords(records) {
  return records.map(extractRecordDataFromRecord);
}

export function extractRecordDataFromRecord(recordOrPromiseRecord) {
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

function anyUnloaded(store: CoreStore, relationship: ManyRelationship) {
  let state = relationship.currentState;
  const unloaded = state.find((s) => {
    let im = store._internalModelForResource(s);
    return im._isDematerializing || !im.currentState.isLoaded;
  });

  return unloaded || false;
}
