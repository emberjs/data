import { A, default as EmberArray } from '@ember/array';
import { assert, inspect } from '@ember/debug';
import EmberError from '@ember/error';
import { get } from '@ember/object';
import { _backburner as emberBackburner, cancel, run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import { importSync } from '@embroider/macros';
import RSVP, { resolve } from 'rsvp';

import type { ManyArray } from '@ember-data/model/-private';
import type { ManyArrayCreateArgs } from '@ember-data/model/-private/system/many-array';
import type {
  BelongsToProxyCreateArgs,
  BelongsToProxyMeta,
} from '@ember-data/model/-private/system/promise-belongs-to';
import type PromiseBelongsTo from '@ember-data/model/-private/system/promise-belongs-to';
import type { HasManyProxyCreateArgs } from '@ember-data/model/-private/system/promise-many-array';
import type PromiseManyArray from '@ember-data/model/-private/system/promise-many-array';
import { HAS_MODEL_PACKAGE, HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import type {
  BelongsToRelationship,
  ManyRelationship,
  RecordData as DefaultRecordData,
} from '@ember-data/record-data/-private';
import type { UpgradedMeta } from '@ember-data/record-data/-private/graph/-edge-definition';
import type {
  DefaultSingleResourceRelationship,
  RelationshipRecordData,
} from '@ember-data/record-data/-private/ts-interfaces/relationship-record-data';

import type { DSModel } from '../../ts-interfaces/ds-model';
import type { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import type { ChangedAttributesHash, RecordData } from '../../ts-interfaces/record-data';
import type { JsonApiResource, JsonApiValidationError } from '../../ts-interfaces/record-data-json-api';
import type { RelationshipSchema } from '../../ts-interfaces/record-data-schemas';
import type { RecordInstance } from '../../ts-interfaces/record-instance';
import type { FindOptions } from '../../ts-interfaces/store';
import type { Dict } from '../../ts-interfaces/utils';
import type CoreStore from '../core-store';
import type { CreateRecordProperties } from '../core-store';
import { errorsHashToArray } from '../errors-utils';
import recordDataFor from '../record-data-for';
import { BelongsToReference, HasManyReference, RecordReference } from '../references';
import Snapshot from '../snapshot';
import { internalModelFactoryFor } from '../store/internal-model-factory';

type PrivateModelModule = {
  ManyArray: { create(args: ManyArrayCreateArgs): ManyArray };
  PromiseBelongsTo: { create(args: BelongsToProxyCreateArgs): PromiseBelongsTo };
  PromiseManyArray: new (...args: unknown[]) => PromiseManyArray;
};

/**
  @module @ember-data/store
*/

const { hasOwnProperty } = Object.prototype;

let _ManyArray: PrivateModelModule['ManyArray'];
let _PromiseBelongsTo: PrivateModelModule['PromiseBelongsTo'];
let _PromiseManyArray: PrivateModelModule['PromiseManyArray'];

let _found = false;
let _getModelPackage: () => boolean;
if (HAS_MODEL_PACKAGE) {
  _getModelPackage = function () {
    if (!_found) {
      let modelPackage = importSync('@ember-data/model/-private') as PrivateModelModule;
      ({
        ManyArray: _ManyArray,
        PromiseBelongsTo: _PromiseBelongsTo,
        PromiseManyArray: _PromiseManyArray,
      } = modelPackage);
      if (_ManyArray && _PromiseBelongsTo && _PromiseManyArray) {
        _found = true;
      }
    }
    return _found;
  };
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
// TODO before deleting the state machine we should
// ensure all things in this map were properly accounted for.
// in the RecordState class.
const TransitionChainMap = Object.create(null);

const _extractPivotNameCache = Object.create(null);
const _splitOnDotCache = Object.create(null);

function splitOnDot(name: string): string[] {
  return _splitOnDotCache[name] || (_splitOnDotCache[name] = name.split('.'));
}

function extractPivotName(name: string): string {
  return _extractPivotNameCache[name] || (_extractPivotNameCache[name] = splitOnDot(name)[0]);
}

function isDSModel(record: RecordInstance | null): record is DSModel {
  return (
    HAS_MODEL_PACKAGE &&
    !!record &&
    'constructor' in record &&
    'isModel' in record.constructor &&
    record.constructor.isModel === true
  );
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
  declare _record: RecordInstance | null;
  declare _scheduledDestroy: any;
  declare _modelClass: any;
  declare __recordArrays: any;
  declare references: any;
  declare _recordReference: RecordReference;
  declare _manyArrayCache: Dict<ManyArray>;

  declare _relationshipPromisesCache: Dict<Promise<ManyArray | RecordInstance>>;
  declare _relationshipProxyCache: Dict<PromiseManyArray | PromiseBelongsTo>;
  declare error: any;
  declare store: CoreStore;
  declare identifier: StableRecordIdentifier;

  constructor(store: CoreStore, identifier: StableRecordIdentifier) {
    if (HAS_MODEL_PACKAGE) {
      _getModelPackage();
    }
    this.store = store;
    this.identifier = identifier;
    this._id = identifier.id;
    this._isUpdatingId = false;
    this.modelName = identifier.type;
    this.clientId = identifier.lid;

    this.__recordData = null;

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
    if (!this.__recordData || !this.hasRecord) {
      return true;
    }

    if (this.isLoading) {
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
      return false;
    }
  }

  isDeleted(): boolean {
    if (this._recordData.isDeleted) {
      return this._recordData.isDeleted();
    } else {
      return false;
    }
  }

  isNew(): boolean {
    if (this._recordData.isNew) {
      return this._recordData.isNew();
    } else {
      return false;
    }
  }

  get isEmpty(): boolean {
    return !this.__recordData || ((!this.isNew() || this.isDeleted()) && this._recordData.isEmpty?.()) || false;
  }

  get isLoading() {
    const req = this.store.getRequestStateService();
    const { identifier } = this;
    // const fulfilled = req.getLastRequestForRecord(identifier);

    return (
      !this.isLoaded &&
      // fulfilled === null &&
      req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query')
    );
  }

  get isLoaded() {
    // if we are new we must consider ourselves loaded
    if (this.isNew()) {
      return true;
    }
    // even if we have a past request, if we are now empty we are not loaded
    // typically this is true after an unloadRecord call
    if (this.isEmpty) {
      return false;
    }
    const req = this.store.getRequestStateService();
    const { identifier } = this;
    const fulfilled = req.getLastRequestForRecord(identifier);
    // if we are not empty, not new && we have a fulfilled request then we are loaded
    // we should consider allowing for something to be loaded that is simply "not empty".
    // which is how RecordState currently handles this case; however, RecordState is buggy
    // in that it does not account for unloading.
    return fulfilled !== null;
  }

  getRecord(properties?: CreateRecordProperties): RecordInstance {
    let record = this._record;

    if (this._isDematerializing) {
      // TODO we should assert here instead of this return.
      return null as unknown as RecordInstance;
    }

    if (!record) {
      let { store } = this;

      record = this._record = store._instantiateRecord(
        this,
        this.modelName,
        this._recordData,
        this.identifier,
        properties
      );
    }

    return record;
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
      let keys = Object.keys(this._relationshipProxyCache);
      keys.forEach((key) => {
        let proxy = this._relationshipProxyCache[key]!;
        if (proxy.destroy) {
          proxy.destroy();
        }
        delete this._relationshipProxyCache[key];
      });
    }

    this._record = null;
    this.error = null;
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
          this.unloadRecord();
        }
      });
    });
  }

  save(options: FindOptions = {}): Promise<void> {
    if (this._deletedRecordWasNew) {
      return resolve();
    }
    let promiseLabel = 'DS: Model#save ' + this;
    let resolver = RSVP.defer<void>(promiseLabel);

    // Casting to promise to narrow due to the feature flag paths inside scheduleSave
    return this.store.scheduleSave(this, resolver, options) as Promise<void>;
  }

  reload(options: Dict<unknown> = {}): Promise<InternalModel> {
    return this.store._reloadRecord(this, options);
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
    if (DEBUG) {
      const requests = this.store.getRequestStateService().getPendingRequestsForRecord(this.identifier);
      if (
        requests.some((req) => {
          return req.type === 'mutation';
        })
      ) {
        assert('You can only unload a record which is not inFlight. `' + this + '`');
      }
    }
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

  _findBelongsTo(
    key: string,
    resource: DefaultSingleResourceRelationship,
    relationshipMeta: RelationshipSchema,
    options?: Dict<unknown>
  ): Promise<RecordInstance | null> {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    // TODO @runspired follow up on whether this should be in the relationship requests cache
    return this.store._findBelongsToByJsonApiResource(resource, this, relationshipMeta, options).then(
      (internalModel) => handleCompletedRelationshipRequest(this, key, resource._relationship, internalModel),
      (e) => handleCompletedRelationshipRequest(this, key, resource._relationship, null, e)
    );
  }

  get isEmpty(): boolean {
    return !this.__recordData || (!this.isNew() && this._recordData.isEmpty?.()) || false;
  }
  get isLoading() {
    const req = this.store.getRequestStateService();
    const { identifier } = this;
    const fulfilled = req.getLastRequestForRecord(identifier);
    return (
      !this.isLoaded &&
      fulfilled === null &&
      req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query')
    );
  }
  get isLoaded() {
    if (this.isNew()) {
      return true;
    }
    const req = this.store.getRequestStateService();
    const { identifier } = this;
    const fulfilled = req.getLastRequestForRecord(identifier);
    return fulfilled !== null || !this.isEmpty;
  }

  getBelongsTo(key: string, options?: Dict<unknown>): PromiseBelongsTo | RecordInstance | null {
    let resource = (this._recordData as DefaultRecordData).getBelongsTo(key);
    let identifier =
      resource && resource.data ? this.store.identifierCache.getOrCreateRecordIdentifier(resource.data) : null;
    let relationshipMeta = this.store._relationshipMetaFor(this.modelName, null, key);
    assert(`Attempted to access a belongsTo relationship but no definition exists for it`, relationshipMeta);

    let store = this.store;
    let parentInternalModel = this;
    let async = relationshipMeta.options.async;
    let isAsync = typeof async === 'undefined' ? true : async;
    let _belongsToState: BelongsToProxyMeta = {
      key,
      store,
      originatingInternalModel: this,
      modelName: relationshipMeta.type,
    };

    if (isAsync) {
      let internalModel = identifier !== null ? store._internalModelForResource(identifier) : null;

      if (resource._relationship.state.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key] as PromiseBelongsTo;
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
          toReturn === null || !internalModel.isEmpty
        );
        return toReturn;
      }
    }
  }

  getManyArray(key: string, definition?: UpgradedMeta): ManyArray {
    assert('hasMany only works with the @ember-data/record-data package', HAS_RECORD_DATA_PACKAGE);
    let manyArray: ManyArray | undefined = this._manyArrayCache[key];
    if (!definition) {
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
      definition = graphFor(this.store).get(this.identifier, key).definition as UpgradedMeta;
    }

    if (!manyArray) {
      manyArray = _ManyArray.create({
        store: this.store,
        type: this.store.modelFor(definition.type),
        recordData: this._recordData as RelationshipRecordData,
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

  fetchAsyncHasMany(
    key: string,
    relationship: ManyRelationship,
    manyArray: ManyArray,
    options?: Dict<unknown>
  ): Promise<ManyArray> {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key] as Promise<ManyArray> | undefined;
      if (loadingPromise) {
        return loadingPromise;
      }

      const jsonApi = this._recordData.getHasMany(key);

      loadingPromise = this.store._findHasManyByJsonApiResource(jsonApi, this, relationship, options).then(
        () => handleCompletedRelationshipRequest(this, key, relationship, manyArray),
        (e) => handleCompletedRelationshipRequest(this, key, relationship, manyArray, e)
      );
      this._relationshipPromisesCache[key] = loadingPromise;
      return loadingPromise;
    }
    assert('hasMany only works with the @ember-data/record-data package');
  }

  getHasMany(key: string, options?): PromiseManyArray | ManyArray {
    if (HAS_RECORD_DATA_PACKAGE) {
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
      const relationship = graphFor(this.store).get(this.identifier, key) as ManyRelationship;
      const { definition, state } = relationship;
      let manyArray = this.getManyArray(key, definition);

      if (definition.isAsync) {
        if (state.hasFailedLoadAttempt) {
          return this._relationshipProxyCache[key] as PromiseManyArray;
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

  _updatePromiseProxyFor(kind: 'hasMany', key: string, args: HasManyProxyCreateArgs): PromiseManyArray;
  _updatePromiseProxyFor(kind: 'belongsTo', key: string, args: BelongsToProxyCreateArgs): PromiseBelongsTo;
  _updatePromiseProxyFor(
    kind: 'belongsTo',
    key: string,
    args: { promise: Promise<RecordInstance | null> }
  ): PromiseBelongsTo;
  _updatePromiseProxyFor(
    kind: 'hasMany' | 'belongsTo',
    key: string,
    args: BelongsToProxyCreateArgs | HasManyProxyCreateArgs | { promise: Promise<RecordInstance | null> }
  ): PromiseBelongsTo | PromiseManyArray {
    let promiseProxy = this._relationshipProxyCache[key];
    if (kind === 'hasMany') {
      const { promise, content } = args as HasManyProxyCreateArgs;
      if (promiseProxy) {
        assert(`Expected a PromiseManyArray`, '_update' in promiseProxy);
        promiseProxy._update(promise, content);
      } else {
        promiseProxy = this._relationshipProxyCache[key] = new _PromiseManyArray(promise, content);
      }
      return promiseProxy;
    }
    if (promiseProxy) {
      const { promise, content } = args as BelongsToProxyCreateArgs;
      assert(`Expected a PromiseBelongsTo`, '_belongsToState' in promiseProxy);

      if (content !== undefined) {
        promiseProxy.set('content', content);
      }
      promiseProxy.set('promise', promise);
    } else {
      // this usage of `any` can be removed when `@types/ember_object` proxy allows `null` for content
      this._relationshipProxyCache[key] = promiseProxy = _PromiseBelongsTo.create(args as any);
    }

    return promiseProxy;
  }

  reloadHasMany(key: string, options) {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key];
      if (loadingPromise) {
        return loadingPromise;
      }
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
      const relationship = graphFor(this.store).get(this.identifier, key) as ManyRelationship;
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

  reloadBelongsTo(key: string, options?: Dict<unknown>): Promise<RecordInstance | null> {
    let loadingPromise = this._relationshipPromisesCache[key] as Promise<RecordInstance | null> | undefined;
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
    assert(`Attempted to reload a belongsTo relationship but no definition exists for it`, relationshipMeta);
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
      !this._record || this._record.isDestroyed || this._record.isDestroying
    );
    this.isDestroying = true;
    if (this._recordReference) {
      this._recordReference.destroy();
    }
    this._recordReference = null;
    let cache = this._manyArrayCache;
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
      delete cache[key];
    });
    if (this.references) {
      cache = this.references;
      Object.keys(cache).forEach((key) => {
        cache[key]!.destroy();
        delete cache[key];
      });
    }

    internalModelFactoryFor(this.store).remove(this);
    this._isDestroyed = true;
  }

  setupData(data) {
    if (this.isNew()) {
      this.store._notificationManager.notify(this.identifier, 'identity');
    }
    const hasRecord = this.hasRecord;
    if (hasRecord) {
      let changedKeys = this._recordData.pushData(data, true);
      this.notifyAttributes(changedKeys);
    } else {
      this._recordData.pushData(data);
    }
  }

  notifyAttributes(keys: string[]): void {
    let manager = this.store._notificationManager;
    let { identifier } = this;

    for (let i = 0; i < keys.length; i++) {
      manager.notify(identifier, 'attributes', keys[i]);
    }
  }

  setDirtyHasMany(key: string, records) {
    assertRecordsPassedToHasMany(records);
    return this._recordData.setDirtyHasMany(key, extractRecordDatasFromRecords(records));
  }

  setDirtyBelongsTo(key: string, value) {
    return this._recordData.setDirtyBelongsTo(key, extractRecordDataFromRecord(value));
  }

  setDirtyAttribute<T>(key: string, value: T): T {
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
      if (this.hasRecord && isDSModel(this._record)) {
        this._record.errors.remove(key);
      }
    }

    return value;
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  get hasRecord(): boolean {
    return !!this._record;
  }

  createSnapshot(options: FindOptions = {}): Snapshot {
    return new Snapshot(options, this.identifier, this.store);
  }

  hasChangedAttributes(): boolean {
    if (!this.__recordData) {
      // no need to calculate changed attributes when calling `findRecord`
      return false;
    }
    return this._recordData.hasChangedAttributes();
  }

  changedAttributes(): ChangedAttributesHash {
    if (!this.__recordData) {
      // no need to calculate changed attributes when calling `findRecord`
      return {};
    }
    return this._recordData.changedAttributes();
  }

  adapterWillCommit(): void {
    this._recordData.willCommit();
    if (this.hasRecord && isDSModel(this._record)) {
      this._record.errors.clear();
    }
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

  notifyPropertyChange(key: string) {
    if (this.hasRecord) {
      // TODO this should likely *mostly* be the `attributes` bucket
      // but it seems for local mutations we rely on computed updating
      // iteself when set. As we design our own thing we may need to change
      // that.
      this.store._notificationManager.notify(this.identifier, 'property', key);
    }
  }

  notifyStateChange(key?: string) {
    if (this.hasRecord) {
      this.store._notificationManager.notify(this.identifier, 'state');
    }
    if (!key || key === 'isDeletionCommitted') {
      this.store.recordArrayManager.recordDidChange(this.identifier);
    }
  }

  rollbackAttributes() {
    this.store._backburner.join(() => {
      let dirtyKeys = this._recordData.rollbackAttributes();
      if (this.hasRecord && isDSModel(this._record)) {
        this._record.errors.clear();
      }

      if (this.hasRecord && dirtyKeys && dirtyKeys.length > 0) {
        this.notifyAttributes(dirtyKeys);
      }
    });
  }

  _unhandledEvent(state, name: string, context) {
    let errorMessage = 'Attempted to handle event `' + name + '` ';
    errorMessage += 'on ' + String(this) + ' while in state ';
    errorMessage += state.stateName + '. ';

    if (context !== undefined) {
      errorMessage += 'Called with ' + inspect(context) + '.';
    }

    throw new EmberError(errorMessage);
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

  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.
  */
  adapterDidCommit(data) {
    this._recordData.didCommit(data);
    this.store.recordArrayManager.recordDidChange(this.identifier);

    if (!data) {
      return;
    }
    this.store._notificationManager.notify(this.identifier, 'attributes');
  }

  hasErrors(): boolean {
    // TODO add assertion forcing consuming RecordData's to implement getErrors
    if (this._recordData.getErrors) {
      return this._recordData.getErrors(this.identifier).length > 0;
    } else {
      // we can't have errors if we never tried loading
      if (!this._record) {
        return false;
      }
      let errors = (this._record as DSModel).errors;
      return errors.length > 0;
    }
  }

  // FOR USE DURING COMMIT PROCESS
  adapterDidInvalidate(parsedErrors, error?) {
    // TODO @runspired this should be handled by RecordState
    // and errors should be dirtied but lazily fetch if at
    // all possible. We should only notify errors here.
    let attribute;
    if (error && parsedErrors) {
      // TODO add assertion forcing consuming RecordData's to implement getErrors
      if (!this._recordData.getErrors) {
        let record = this.getRecord() as DSModel;
        let errors = record.errors;
        for (attribute in parsedErrors) {
          if (hasOwnProperty.call(parsedErrors, attribute)) {
            errors.add(attribute, parsedErrors[attribute]);
          }
        }
      }

      let jsonApiErrors: JsonApiValidationError[] = errorsHashToArray(parsedErrors);
      if (jsonApiErrors.length === 0) {
        jsonApiErrors = [{ title: 'Invalid Error', detail: '', source: { pointer: '/data' } }];
      }
      this._recordData.commitWasRejected(this.identifier, jsonApiErrors);
    } else {
      this._recordData.commitWasRejected(this.identifier);
    }
  }

  notifyErrorsChange() {
    this.store._notificationManager.notify(this.identifier, 'errors');
  }

  adapterDidError() {
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
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
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

function handleCompletedRelationshipRequest(
  internalModel: InternalModel,
  key: string,
  relationship: BelongsToRelationship,
  value: InternalModel | null
): RecordInstance | null;
function handleCompletedRelationshipRequest(
  internalModel: InternalModel,
  key: string,
  relationship: ManyRelationship,
  value: ManyArray
): ManyArray;
function handleCompletedRelationshipRequest(
  internalModel: InternalModel,
  key: string,
  relationship: BelongsToRelationship,
  value: null,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  internalModel: InternalModel,
  key: string,
  relationship: ManyRelationship,
  value: ManyArray,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  internalModel: InternalModel,
  key: string,
  relationship: BelongsToRelationship | ManyRelationship,
  value: ManyArray | InternalModel | null,
  error?: Error
): ManyArray | RecordInstance | null {
  delete internalModel._relationshipPromisesCache[key];
  relationship.state.shouldForceReload = false;
  const isHasMany = relationship.definition.kind === 'hasMany';

  if (isHasMany) {
    // we don't notify the record property here to avoid refetch
    // only the many array
    (value as ManyArray).notify();
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
        // TODO @types/ember__object incorrectly disallows `null`, we should either
        // override or fix upstream
        (proxy as PromiseBelongsTo).set('content', null as unknown as undefined);
      }
    }

    throw error;
  }

  if (isHasMany) {
    (value as ManyArray).set('isLoaded', true);
  }

  relationship.state.hasFailedLoadAttempt = false;
  // only set to not stale if no error is thrown
  relationship.state.isStale = false;

  return isHasMany || !value ? (value as ManyArray | null) : (value as InternalModel).getRecord();
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
    return im._isDematerializing || !im.isLoaded;
  });

  return unloaded || false;
}
