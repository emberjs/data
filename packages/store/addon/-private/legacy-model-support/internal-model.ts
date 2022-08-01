import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';
import type { RecordData } from '@ember-data/types/q/record-data';
import type { JsonApiResource, JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';

import { internalModelFactoryFor, recordIdentifierFor } from '../caches/internal-model-factory';
import type Store from '../store-service';
import type ShimModelClass from './shim-model-class';

/**
  @module @ember-data/store
*/

type AdapterErrors = Error & { errors?: unknown[]; isAdapterError?: true; code?: string };
type SerializerWithParseErrors = MinimumSerializerInterface & {
  extractErrors?(store: Store, modelClass: ShimModelClass, error: AdapterErrors, recordId: string | null): any;
};

export default class InternalModel {
  declare _id: string | null;
  declare modelName: string;
  declare hasRecordData: boolean;
  declare _isDestroyed: boolean;
  declare _isDematerializing: boolean;
  declare isDestroying: boolean;
  declare _isUpdatingId: boolean;

  // Not typed yet
  declare store: Store;
  declare identifier: StableRecordIdentifier;
  declare hasRecord: boolean;

  constructor(store: Store, identifier: StableRecordIdentifier) {
    this.store = store;
    this.identifier = identifier;
    this._id = identifier.id;
    this._isUpdatingId = false;
    this.modelName = identifier.type;
    this.hasRecord = false;

    this.hasRecordData = false;

    this._isDestroyed = false;

    // During dematerialization we don't want to rematerialize the record.  The
    // reason this might happen is that dematerialization removes records from
    // record arrays,  and Ember arrays will always `objectAt(0)` and
    // `objectAt(len - 1)` to test whether or not `firstObject` or `lastObject`
    // have changed.
    this._isDematerializing = false;
  }

  get id(): string | null {
    return this.identifier.id;
  }
  set id(value: string | null) {
    if (value !== this._id) {
      let newIdentifier = { type: this.identifier.type, lid: this.identifier.lid, id: value };
      // TODO potentially this needs to handle merged result
      this.store.identifierCache.updateRecordIdentifier(this.identifier, newIdentifier);
      if (this.hasRecord) {
        // TODO this should likely *mostly* be the a different bucket
        this.store._notificationManager.notify(this.identifier, 'property', 'id');
      }
    }
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
        this.store._instanceCache.setRecordId(this.modelName, id, this.identifier.lid);
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



  // STATE we end up needing for various reasons
  get _recordData(): RecordData {
    return this.store._instanceCache.getRecordData(this.identifier);
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

  get isDestroyed(): boolean {
    return this._isDestroyed;
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
    this._isDematerializing = true;

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
    this.store.recordArrayManager.recordDidChange(this.identifier);
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

  // FOR USE DURING COMMIT PROCESS
  adapterDidInvalidate(error: Error & { errors?: JsonApiValidationError[]; isAdapterError?: true; code?: string }) {
    if (error && error.isAdapterError === true && error.code === 'InvalidError') {
      let serializer = this.store.serializerFor(this.modelName) as SerializerWithParseErrors;

      // TODO @deprecate extractErrors being called
      // TODO remove extractErrors from the default serializers.
      if (serializer && typeof serializer.extractErrors === 'function') {
        let errorsHash = serializer.extractErrors(this.store, this.store.modelFor(this.modelName), error, this.id);
        error.errors = errorsHashToArray(errorsHash);
      }
    }

    if (error.errors) {
      assert(
        `Expected the RecordData implementation for ${this.identifier} to have a getErrors(identifier) method for retreiving errors.`,
        typeof this._recordData.getErrors === 'function'
      );

      let jsonApiErrors: JsonApiValidationError[] = error.errors;
      if (jsonApiErrors.length === 0) {
        jsonApiErrors = [{ title: 'Invalid Error', detail: '', source: { pointer: '/data' } }];
      }
      this._recordData.commitWasRejected(this.identifier, jsonApiErrors);
    } else {
      this._recordData.commitWasRejected(this.identifier);
    }
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}

function makeArray(value) {
  return Array.isArray(value) ? value : [value];
}

const PRIMARY_ATTRIBUTE_KEY = 'base';

function errorsHashToArray(errors): JsonApiValidationError[] {
  const out: JsonApiValidationError[] = [];

  if (errors) {
    Object.keys(errors).forEach((key) => {
      let messages = makeArray(errors[key]);
      for (let i = 0; i < messages.length; i++) {
        let title = 'Invalid Attribute';
        let pointer = `/data/attributes/${key}`;
        if (key === PRIMARY_ATTRIBUTE_KEY) {
          title = 'Invalid Document';
          pointer = `/data`;
        }
        out.push({
          title: title,
          detail: messages[i],
          source: {
            pointer: pointer,
          },
        });
      }
    });
  }

  return out;
}
