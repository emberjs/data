import { getOwner, setOwner } from '@ember/application';
import { A, default as EmberArray } from '@ember/array';
import { assert, inspect } from '@ember/debug';
import EmberError from '@ember/error';
import { get, set } from '@ember/object';
import { assign } from '@ember/polyfills';
import { _backburner as emberBackburner, cancel, run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import RSVP, { Promise } from 'rsvp';

import {
  CUSTOM_MODEL_CLASS,
  RECORD_DATA_ERRORS,
  RECORD_DATA_STATE,
  REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT,
  REQUEST_SERVICE,
} from '@ember-data/canary-features';
import { HAS_MODEL_PACKAGE, HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';

import { identifierCacheFor } from '../../identifiers/cache';
import { errorsHashToArray } from '../errors-utils';
import { recordArraysForIdentifier } from '../record-array-manager';
import recordDataFor from '../record-data-for';
import { BelongsToReference, HasManyReference, RecordReference } from '../references';
import Snapshot from '../snapshot';
import { internalModelFactoryFor, setRecordIdentifier } from '../store/internal-model-factory';
import RootState from './states';

type DefaultSingleResourceRelationship =
  import('@ember-data/record-data/-private/ts-interfaces/relationship-record-data').DefaultSingleResourceRelationship;

type HasManyProxyCreateArgs = import('@ember-data/model/-private/system/promise-many-array').HasManyProxyCreateArgs;

type BelongsToProxyCreateArgs = import('@ember-data/model/-private/system/promise-belongs-to').BelongsToProxyCreateArgs;
type RelationshipRecordData =
  import('@ember-data/record-data/-private/ts-interfaces/relationship-record-data').RelationshipRecordData;
type DSModelSchema = import('../../ts-interfaces/ds-model').DSModelSchema;
type ManyArrayCreateArgs = import('@ember-data/model/-private/system/many-array').ManyArrayCreateArgs;
type DSModel = import('../../ts-interfaces/ds-model').DSModel;
type CreateOptions = import('../schema-definition-service').CreateOptions;
type CreateRecordProperties = import('../core-store').CreateRecordProperties;
type BelongsToProxyMeta = import('@ember-data/model/-private/system/promise-belongs-to').BelongsToProxyMeta;
type Dict<T> = import('../../ts-interfaces/utils').Dict<T>;
type RelationshipSchema = import('../../ts-interfaces/record-data-schemas').RelationshipSchema;
type ModelFactory = import('../schema-definition-service').ModelFactory;
type BelongsToRelationship = import('@ember-data/record-data/-private').BelongsToRelationship;
type ManyRelationship = import('@ember-data/record-data/-private').ManyRelationship;
type UpgradedMeta = import('@ember-data/record-data/-private/graph/-edge-definition').UpgradedMeta;
type CoreStore = import('../core-store').default;
type StableRecordIdentifier = import('../../ts-interfaces/identifier').StableRecordIdentifier;
type RecordInstance = import('../../ts-interfaces/record-instance').RecordInstance;
type JsonApiResource = import('../../ts-interfaces/record-data-json-api').JsonApiResource;
type JsonApiValidationError = import('../../ts-interfaces/record-data-json-api').JsonApiValidationError;
type RecordData = import('../../ts-interfaces/record-data').RecordData;
type FindOptions = import('../../ts-interfaces/store').FindOptions;
type Store = import('../ds-model-store').default;
type DefaultRecordData = import('@ember-data/record-data/-private').RecordData;
type ManyArray = import('@ember-data/model/-private').ManyArray;
type PromiseBelongsTo = import('@ember-data/model/-private/system/promise-belongs-to').default;
type PromiseManyArray = import('@ember-data/model/-private/system/promise-many-array').default;

/**
  @module @ember-data/store
*/

const { hasOwnProperty } = Object.prototype;

let ManyArray: { create(args: ManyArrayCreateArgs): ManyArray };
let PromiseBelongsTo: { create(args: BelongsToProxyCreateArgs): PromiseBelongsTo };
let _PromiseManyArray: new (...args: any[]) => PromiseManyArray;

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
const _extractPivotNameCache: Dict<string> = Object.create(null);
const _splitOnDotCache: Dict<string[]> = Object.create(null);

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
  declare _promiseProxy: any;
  declare _record: RecordInstance | null;
  declare _scheduledDestroy: any;
  declare _modelClass: any;
  declare _deferredTriggers: any;
  declare __recordArrays: any;
  declare references: any;
  declare _recordReference: any;
  declare _manyArrayCache: Dict<ManyArray>;

  declare _relationshipPromisesCache: Dict<RSVP.Promise<any>>;
  declare _relationshipProxyCache: Dict<PromiseManyArray | PromiseBelongsTo>;
  declare error: any;
  declare currentState: any;
  declare _previousState: any;
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
      identifierCacheFor(this.store).updateRecordIdentifier(this.identifier, newIdentifier);
      this.notifyPropertyChange('id');
    }
  }

  get modelClass() {
    if (this.store.modelFor) {
      return this._modelClass || (this._modelClass = this.store.modelFor(this.modelName));
    }
  }

  get recordReference() {
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

    if (RECORD_DATA_STATE) {
      if (this.currentState.isLoading) {
        return false;
      }
    }

    let isRecordFullyDeleted;
    if (RECORD_DATA_STATE) {
      isRecordFullyDeleted = this._isRecordFullyDeleted();
    } else {
      isRecordFullyDeleted = this.currentState.stateName === 'root.deleted.saved';
    }
    return this._isDematerializing || this.hasScheduledDestroy() || this.isDestroyed || isRecordFullyDeleted;
  }

  _isRecordFullyDeleted(): boolean {
    if (RECORD_DATA_STATE) {
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
    } else {
      // assert here
      return false;
    }
  }

  isDeleted() {
    if (RECORD_DATA_STATE) {
      if (this._recordData.isDeleted) {
        return this._recordData.isDeleted();
      } else {
        return this.currentState.isDeleted;
      }
    } else {
      return this.currentState.isDeleted;
    }
  }

  isNew() {
    if (RECORD_DATA_STATE) {
      if (this._recordData.isNew) {
        return this._recordData.isNew();
      } else {
        return this.currentState.isNew;
      }
    } else {
      return this.currentState.isNew;
    }
  }

  getRecord(properties?: CreateRecordProperties): RecordInstance {
    let record = this._record;

    if (this._isDematerializing) {
      // TODO we should assert here instead of this return.
      return null as unknown as RecordInstance;
    }

    if (!record) {
      let { store } = this;

      if (CUSTOM_MODEL_CLASS) {
        record = this._record = store._instantiateRecord(
          this,
          this.modelName,
          this._recordData,
          this.identifier,
          properties
        );
      } else {
        // lookupFactory should really return an object that creates
        // instances with the injections applied
        let createOptions: CreateOptions = {
          store,
          _internalModel: this,
        };

        if (!REQUEST_SERVICE) {
          createOptions.isError = this.isError;
          createOptions.adapterError = this.error;
        }

        if (properties !== undefined) {
          assert(
            `You passed '${properties}' as properties for record creation instead of an object.`,
            typeof properties === 'object' && properties !== null
          );

          const { id } = properties;

          if (id) {
            this.setId(id);
          }

          // convert relationship Records to RecordDatas before passing to RecordData
          let defs = store._relationshipsDefinitionFor(this.modelName);

          if (defs !== null) {
            let keys = Object.keys(properties);
            let relationshipValue;

            for (let i = 0; i < keys.length; i++) {
              let prop = keys[i];
              let def = defs[prop];

              if (def !== undefined) {
                if (def.kind === 'hasMany') {
                  if (DEBUG) {
                    assertRecordsPassedToHasMany(properties[prop]);
                  }
                  relationshipValue = extractRecordDatasFromRecords(properties[prop]);
                } else {
                  relationshipValue = extractRecordDataFromRecord(properties[prop]);
                }

                properties[prop] = relationshipValue;
              }
            }
          }
        }

        let additionalCreateOptions = this._recordData._initRecordCreateOptions(properties);
        assign(createOptions, additionalCreateOptions);

        // ensure that `getOwner(this)` works inside a model instance
        setOwner(createOptions, getOwner(store));

        record = this._record = (
          (store as Store)._modelFactoryFor(this.modelName) as ModelFactory
        ).create<RecordInstance>(createOptions);
        setRecordIdentifier(this._record, this.identifier);
      }
      this._triggerDeferredTriggers();
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
    if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT) {
      this.store.recordArrayManager.recordDidChange(this.identifier);
    }
    if (this._record) {
      if (CUSTOM_MODEL_CLASS) {
        this.store.teardownRecord(this._record);
      } else {
        (this._record as DSModel).destroy();
      }
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
    this._previousState = this.currentState;
    this.currentState = RootState.empty;
    if (REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT) {
      this.store.recordArrayManager.recordDidChange(this.identifier);
    }
  }

  deleteRecord() {
    run(() => {
      const backburner = this.store._backburner;
      backburner.run(() => {
        if (RECORD_DATA_STATE) {
          if (this._recordData.setIsDeleted) {
            this._recordData.setIsDeleted(true);
          }
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

  save(options?: Dict<unknown>): Promise<void> {
    if (this._deletedRecordWasNew) {
      return Promise.resolve();
    }
    let promiseLabel = 'DS: Model#save ' + this;
    let resolver = RSVP.defer<void>(promiseLabel);

    if (REQUEST_SERVICE) {
      // Casting to promise to narrow due to the feature flag paths inside scheduleSave
      return this.store.scheduleSave(this, resolver, options) as Promise<void>;
    } else {
      this.store.scheduleSave(this, resolver, options);
      return resolver.promise;
    }
  }

  reload(options?: Dict<unknown>) {
    if (REQUEST_SERVICE) {
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
    } else {
      let internalModel = this;
      let promiseLabel = 'DS: Model#reload of ' + this;

      return new Promise(function (resolve) {
        internalModel.send('reloadRecord', { resolve, options });
      }, promiseLabel).then(
        function () {
          internalModel.didCleanError();
          return internalModel;
        },
        function (error) {
          internalModel.didError(error);
          throw error;
        },
        'DS: Model#reload complete, update flags'
      );
    }
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

  _findBelongsTo(
    key: string,
    resource: DefaultSingleResourceRelationship,
    relationshipMeta: RelationshipSchema,
    options?: Dict<unknown>
  ): Promise<RecordInstance | null> {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    return this.store._findBelongsToByJsonApiResource(resource, this, relationshipMeta, options).then(
      (record: RecordInstance | null) => handleCompletedRelationshipRequest(this, key, resource._relationship, record),
      (e) => handleCompletedRelationshipRequest(this, key, resource._relationship, null, e)
    );
  }

  getBelongsTo(key: string, options?: Dict<unknown>): PromiseBelongsTo | RecordInstance | null {
    let resource = (this._recordData as DefaultRecordData).getBelongsTo(key);
    let identifier =
      resource && resource.data ? identifierCacheFor(this.store).getOrCreateRecordIdentifier(resource.data) : null;
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
          toReturn === null || !internalModel.currentState.isEmpty
        );
        return toReturn;
      }
    }
  }

  getManyArray(key: string, definition?: UpgradedMeta): ManyArray {
    if (HAS_RECORD_DATA_PACKAGE) {
      let manyArray = this._manyArrayCache[key];
      if (!definition) {
        const graphFor = require('@ember-data/record-data/-private').graphFor;
        definition = graphFor(this.store).get(this.identifier, key).definition as UpgradedMeta;
      }

      if (!manyArray) {
        manyArray = ManyArray.create({
          store: this.store,
          type: this.store.modelFor(definition.type) as DSModelSchema,
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
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  fetchAsyncHasMany(
    key: string,
    relationship: ManyRelationship,
    manyArray: ManyArray,
    options?: Dict<unknown>
  ): Promise<ManyArray> {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key];
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
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  getHasMany(key: string, options) {
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

    // hasMany case
    if (kind === 'hasMany') {
      const { promise, content } = args as HasManyProxyCreateArgs;
      if (promiseProxy) {
        (promiseProxy as PromiseManyArray)._update(promise, content);
      } else {
        promiseProxy = this._relationshipProxyCache[key] = new _PromiseManyArray(promise, content);
      }
      return promiseProxy;
    }

    // belongsTo case
    if (promiseProxy) {
      const { promise, content } = args as BelongsToProxyCreateArgs;
      if (content !== undefined) {
        (promiseProxy as PromiseBelongsTo).set('content', content);
      }
      (promiseProxy as PromiseBelongsTo).set('promise', promise);
    } else {
      this._relationshipProxyCache[key] = promiseProxy = PromiseBelongsTo.create(args as BelongsToProxyCreateArgs);
    }

    return promiseProxy;
  }

  reloadHasMany(key: string, options) {
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

  reloadBelongsTo(key: string, options?: Dict<unknown>): Promise<RecordInstance | null> {
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
    assert(`Attempted to reload a belongsTo relationship but no definition exists for it`, relationshipMeta);
    let promise = this._findBelongsTo(key, resource, relationshipMeta, options);
    if (this._relationshipProxyCache[key]) {
      return this._updatePromiseProxyFor('belongsTo', key, { promise }).then((v) => v);
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
    let cache = this._manyArrayCache;
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
      delete cache[key];
    });

    internalModelFactoryFor(this.store).remove(this);
    this._isDestroyed = true;
  }

  setupData(data) {
    const hasRecord = this.hasRecord;
    if (hasRecord) {
      let changedKeys = this._recordData.pushData(data, hasRecord);
      if (CUSTOM_MODEL_CLASS) {
        this.notifyAttributes(changedKeys);
      } else {
        (this._record as DSModel)._notifyProperties(changedKeys);
      }
    } else {
      this._recordData.pushData(data);
    }
    this.send('pushedData');
  }

  notifyAttributes(keys: string[]): void {
    assert(`notifyAttributes may only be used with CUSTOM_MODEL_CLASS`, CUSTOM_MODEL_CLASS);
    let manager = this.store._notificationManager;
    let { identifier } = this;

    for (let i = 0; i < keys.length; i++) {
      manager.notify(identifier, 'attributes', keys[i]);
    }
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
    if (REQUEST_SERVICE) {
      if (!this.__recordData) {
        // no need to calculate changed attributes when calling `findRecord`
        return false;
      }
    } else {
      if (this.currentState.isLoading) {
        // no need to calculate changed attributes when calling `findRecord`
        return false;
      }
    }
    return this._recordData.hasChangedAttributes();
  }

  changedAttributes() {
    if (REQUEST_SERVICE) {
      if (!this.__recordData) {
        // no need to calculate changed attributes when calling `findRecord`
        return {};
      }
    } else {
      if (this.currentState.isLoading) {
        // no need to calculate changed attributes when calling `findRecord`
        return {};
      }
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
      if (CUSTOM_MODEL_CLASS) {
        this.store._notificationManager.notify(this.identifier, 'relationships', key);
      } else {
        let manyArray = this._manyArrayCache[key];

        if (manyArray) {
          manyArray.notify();

          //We need to notifyPropertyChange in the adding case because we need to make sure
          //we fetch the newly added record in case it is unloaded
          //TODO(Igor): Consider whether we could do this only if the record state is unloaded
          if (manyArray.isAsync) {
            (this._record as DSModel).notifyPropertyChange(key);
          }
        }
      }
    }
  }

  notifyBelongsToChange(key: string) {
    if (this.hasRecord) {
      if (CUSTOM_MODEL_CLASS) {
        this.store._notificationManager.notify(this.identifier, 'relationships', key);
      } else {
        (this._record as DSModel).notifyPropertyChange(key);
      }
    }
  }

  notifyPropertyChange(key) {
    if (this.hasRecord) {
      if (CUSTOM_MODEL_CLASS) {
        // TODO this should likely *mostly* be the `attributes` bucket
        // but it seems for local mutations we rely on computed updating
        // iteself when set. As we design our own thing we may need to change
        // that.
        this.store._notificationManager.notify(this.identifier, 'property', key);
      } else {
        if (key === 'currentState') {
          set(this._record as DSModel, 'currentState', this.currentState);
        } else {
          (this._record as DSModel).notifyPropertyChange(key);
        }
      }
    }
  }

  notifyStateChange(key?) {
    assert('Cannot notify state change if Record Data State flag is not on', !!RECORD_DATA_STATE);
    if (this.hasRecord) {
      if (CUSTOM_MODEL_CLASS) {
        this.store._notificationManager.notify(this.identifier, 'state');
      } else {
        if (!key || key === 'isNew') {
          (this._record as DSModel).notifyPropertyChange('isNew');
        }
        if (!key || key === 'isDeleted') {
          (this._record as DSModel).notifyPropertyChange('isDeleted');
        }
      }
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
        if (CUSTOM_MODEL_CLASS) {
          this.notifyAttributes(dirtyKeys);
        } else {
          (this._record as DSModel)._notifyProperties(dirtyKeys);
        }
      }
    });
  }

  transitionTo(name: string) {
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
    if (CUSTOM_MODEL_CLASS) {
      if (this.hasRecord && isDSModel(this._record)) {
        this.notifyStateChange('currentState');
      }
    } else {
      this.notifyPropertyChange('currentState');
    }

    for (i = 0, l = setups.length; i < l; i++) {
      setups[i].setup(this);
    }
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
    let record = this._record as DSModel;
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
      if (CUSTOM_MODEL_CLASS) {
        this.store._notificationManager.notify(this.identifier, 'identity');
      } else {
        this.notifyPropertyChange('id');
      }
    }
    this._isUpdatingId = false;
  }

  didError(error) {
    if (!REQUEST_SERVICE) {
      this.error = error;
      this.isError = true;

      if (this.hasRecord) {
        (this._record as DSModel).setProperties({
          isError: true,
          adapterError: error,
        });
      }
    }
  }

  didCleanError() {
    if (!REQUEST_SERVICE) {
      this.error = null;
      this.isError = false;

      if (this.hasRecord) {
        (this._record as DSModel).setProperties({
          isError: false,
          adapterError: null,
        });
      }
    }
  }

  /*
    If the adapter did not return a hash in response to a commit,
    merge the changed attributes and relationships into the existing
    saved data.
  */
  adapterDidCommit(data) {
    this.didCleanError();

    let changedKeys = this._recordData.didCommit(data);

    this.send('didCommit');
    this.store.recordArrayManager.recordDidChange(this.identifier);

    if (!data) {
      return;
    }
    if (CUSTOM_MODEL_CLASS) {
      this.store._notificationManager.notify(this.identifier, 'attributes');
    } else {
      (this._record as DSModel)._notifyProperties(changedKeys);
    }
  }

  hasErrors(): boolean {
    if (!this._record) {
      return false;
    }
    if (RECORD_DATA_ERRORS) {
      // TODO add assertion forcing consuming RecordData's to implement getErrors
      if (this._recordData.getErrors) {
        return this._recordData.getErrors(this.identifier).length > 0;
      } else {
        let errors = (this._record as DSModel).errors;
        return errors.length > 0;
      }
    } else {
      let errors = (this._record as DSModel).errors;
      return errors.length > 0;
    }
  }

  // FOR USE DURING COMMIT PROCESS
  adapterDidInvalidate(parsedErrors, error?) {
    if (RECORD_DATA_ERRORS) {
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
              errors._add(attribute, parsedErrors[attribute]);
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
    } else {
      let attribute: string;
      let record = this.getRecord() as DSModel;
      let errors = record.errors;

      for (attribute in parsedErrors) {
        if (hasOwnProperty.call(parsedErrors, attribute)) {
          errors._add(attribute, parsedErrors[attribute]);
        }
      }

      this.send('becameInvalid');

      this._recordData.commitWasRejected();
    }
  }

  notifyErrorsChange() {
    if (CUSTOM_MODEL_CLASS) {
      this.store._notificationManager.notify(this.identifier, 'errors');
    }
  }

  adapterDidError(error) {
    this.send('becameError');
    this.didError(error);

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

// in production code, this is only accesssed in `record-array-manager`
// if REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT is also false
if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT) {
  Object.defineProperty(InternalModel.prototype, '_recordArrays', {
    get() {
      return recordArraysForIdentifier(this.identifier);
    },
  });
}

function handleCompletedRelationshipRequest(
  internalModel: InternalModel,
  key: string,
  relationship: BelongsToRelationship,
  value: RecordInstance | null
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
  value: ManyArray | RecordInstance | null,
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
        (proxy as PromiseBelongsTo).set('content', null);
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

  // only null in the error branch
  return value as ManyArray | RecordInstance | null;
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
  // Can't use `find` because of IE11 and these arrays are potentially massive
  let state = relationship.currentState;
  let unloaded = false;
  for (let i = 0; i < state.length; i++) {
    let im = store._internalModelForResource(state[i]);
    if (im._isDematerializing || !im.currentState.isLoaded) {
      unloaded = true;
      break;
    }
  }
  return unloaded;
}
