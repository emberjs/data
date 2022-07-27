import { assert } from '@ember/debug';
import { _backburner as emberBackburner, cancel, run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import { HAS_MODEL_PACKAGE } from '@ember-data/private-build-infra';
import type { DSModel } from '@ember-data/types/q/ds-model';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { ChangedAttributesHash, RecordData } from '@ember-data/types/q/record-data';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

import type Store from '../core-store';
import { errorsHashToArray } from '../errors-utils';
import { internalModelFactoryFor } from '../internal-model-factory';

/**
  @module @ember-data/store
*/

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
  declare hasRecordData: boolean;
  declare _isDestroyed: boolean;
  declare isError: boolean;
  declare _pendingRecordArrayManagerFlush: boolean;
  declare _isDematerializing: boolean;
  declare _doNotDestroy: boolean;
  declare isDestroying: boolean;
  declare _isUpdatingId: boolean;
  declare _deletedRecordWasNew: boolean;

  // Not typed yet
  declare _scheduledDestroy: any;
  declare _modelClass: any;
  declare __recordArrays: any;
  declare error: any;
  declare store: Store;
  declare identifier: StableRecordIdentifier;
  declare hasRecord: boolean;

  constructor(store: Store, identifier: StableRecordIdentifier) {
    this.store = store;
    this.identifier = identifier;
    this._id = identifier.id;
    this._isUpdatingId = false;
    this.modelName = identifier.type;
    this.clientId = identifier.lid;
    this.hasRecord = false;

    this.hasRecordData = false;

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

    this.error = null;

    // caches for lazy getters
    this._modelClass = null;
    this.__recordArrays = null;

    this.error = null;
  }

  get id(): string | null {
    return this.identifier.id;
  }
  set id(value: string | null) {
    if (value !== this._id) {
      let newIdentifier = { type: this.identifier.type, lid: this.identifier.lid, id: value };
      // TODO potentially this needs to handle merged result
      this.store.identifierCache.updateRecordIdentifier(this.identifier, newIdentifier);
      this.notifyPropertyChange('id');
    }
  }

  get modelClass() {
    if (this.store.modelFor) {
      return this._modelClass || (this._modelClass = this.store.modelFor(this.modelName));
    }
  }

  get _recordData(): RecordData {
    return this.store._instanceCache.getRecordData(this.identifier);
  }

  isHiddenFromRecordArrays() {
    // During dematerialization we don't want to rematerialize the record.
    // recordWasDeleted can cause other records to rematerialize because it
    // removes the internal model from the array and Ember arrays will always
    // `objectAt(0)` and `objectAt(len -1)` to check whether `firstObject` or
    // `lastObject` have changed.  When this happens we don't want those
    // models to rematerialize their records.

    // eager checks to avoid instantiating record data if we are empty or loading
    if (this.isEmpty) {
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
    if (this.hasRecordData && this._recordData.isNew) {
      return this._recordData.isNew();
    } else {
      return false;
    }
  }

  get isEmpty(): boolean {
    return !this.hasRecordData || ((!this.isNew() || this.isDeleted()) && this._recordData.isEmpty?.()) || false;
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

    // if we are not empty, not new && we have a fulfilled request then we are loaded
    // we should consider allowing for something to be loaded that is simply "not empty".
    // which is how RecordState currently handles this case; however, RecordState is buggy
    // in that it does not account for unloading.
    return !this.isEmpty;
  }

  dematerializeRecord() {
    this._isDematerializing = true;

    // TODO IGOR add a test that fails when this is missing, something that involves canceling a destroy
    // and the destroy not happening, and then later on trying to destroy
    this._doNotDestroy = false;
    // this has to occur before the internal model is removed
    // for legacy compat.
    const { identifier } = this;
    this.store._instanceCache.removeRecord(identifier);

    // move to an empty never-loaded state
    // ensure any record notifications happen prior to us
    // unseting the record but after we've triggered
    // destroy
    this.store._backburner.join(() => {
      this._recordData.unloadRecord();
    });

    this.hasRecord = false; // this must occur after relationship removal
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

  destroyFromRecordData() {
    if (this._doNotDestroy) {
      this._doNotDestroy = false;
      return;
    }
    this.destroy();
  }

  destroy() {
    let record = this.store._instanceCache.peek({ identifier: this.identifier, bucket: 'record' });
    assert(
      'Cannot destroy an internalModel while its record is materialized',
      !record || record.isDestroyed || record.isDestroying
    );
    this.isDestroying = true;

    internalModelFactoryFor(this.store).remove(this);
    this._isDestroyed = true;
  }

  setupData(data) {
    if (this.isNew()) {
      this.store._notificationManager.notify(this.identifier, 'identity');
    }
    this._recordData.pushData(data, this.hasRecord);
  }

  notifyAttributes(keys: string[]): void {
    if (this.hasRecord) {
      let manager = this.store._notificationManager;
      let { identifier } = this;

      if (!keys || !keys.length) {
        manager.notify(identifier, 'attributes');
      } else {
        for (let i = 0; i < keys.length; i++) {
          manager.notify(identifier, 'attributes', keys[i]);
        }
      }
    }
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  hasChangedAttributes(): boolean {
    if (!this.hasRecordData) {
      // no need to calculate changed attributes when calling `findRecord`
      return false;
    }
    return this._recordData.hasChangedAttributes();
  }

  changedAttributes(): ChangedAttributesHash {
    if (!this.hasRecordData) {
      // no need to calculate changed attributes when calling `findRecord`
      return {};
    }
    return this._recordData.changedAttributes();
  }

  adapterWillCommit(): void {
    this._recordData.willCommit();
    let record = this.store._instanceCache.peek({ identifier: this.identifier, bucket: 'record' });
    if (record && isDSModel(record)) {
      record.errors.clear();
    }
  }

  notifyHasManyChange(key: string) {
    if (this.hasRecord) {
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

      let record = this.store._instanceCache.peek({ identifier: this.identifier, bucket: 'record' });
      if (record && isDSModel(record)) {
        record.errors.clear();
      }

      if (this.hasRecord && dirtyKeys && dirtyKeys.length > 0) {
        this.notifyAttributes(dirtyKeys);
      }
    });
  }

  removeFromInverseRelationships() {
    if (this.hasRecordData) {
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
      let preloadValue = preload[key];
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
   * calling `InstanceCache.setRecordId` is necessary to update
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
  setId(id: string | null, fromCache: boolean = false) {
    if (this._isUpdatingId === true) {
      return;
    }
    this._isUpdatingId = true;
    let didChange = id !== this._id;
    this._id = id;

    if (didChange && id !== null) {
      if (!fromCache) {
        this.store._instanceCache.setRecordId(this.modelName, id, this.clientId);
      }
      // internal set of ID to get it to RecordData from DS.Model
      // if we are within create we may not have a recordData yet.
      if (this.hasRecordData && this._recordData.__setId) {
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
  }

  hasErrors(): boolean {
    // TODO add assertion forcing consuming RecordData's to implement getErrors
    if (this._recordData.getErrors) {
      return this._recordData.getErrors(this.identifier).length > 0;
    } else {
      let record = this.store._instanceCache.peek({ identifier: this.identifier, bucket: 'record' });
      // we can't have errors if we never tried loading
      if (!record) {
        return false;
      }
      let errors = (record as DSModel).errors;
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
        let record = this.store._instanceCache.getRecord(this.identifier) as DSModel;
        let errors = record.errors;
        for (attribute in parsedErrors) {
          if (Object.prototype.hasOwnProperty.call(parsedErrors, attribute)) {
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
}
