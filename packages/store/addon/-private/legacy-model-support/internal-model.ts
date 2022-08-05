import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';

import type Store from '../store-service';

export default class InternalModel {
  declare hasRecordData: boolean;
  declare _isDestroyed: boolean;
  declare isDestroying: boolean;
  declare _isUpdatingId: boolean;

  // Not typed yet
  declare store: Store;
  declare identifier: StableRecordIdentifier;
  declare hasRecord: boolean;

  constructor(store: Store, identifier: StableRecordIdentifier) {
    this.store = store;
    this.identifier = identifier;
    this._isUpdatingId = false;

    this.hasRecordData = false;

    this._isDestroyed = false;
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
    if (!this.hasRecordData) {
      return true;
    }
    const recordData = this._recordData;
    const isNew = recordData.isNew?.() ||  false;
    const isDeleted = recordData.isDeleted?.() || false;
    const isEmpty = recordData.isEmpty?.() || false;

    return (!isNew || isDeleted) && isEmpty;
  }

  get isLoading() {
    const req = this.store.getRequestStateService();
    const { identifier } = this;
    // const fulfilled = req.getLastRequestForRecord(identifier);
    const isLoaded = this.store._instanceCache.recordIsLoaded(identifier);

    return (
      !isLoaded &&
      // fulfilled === null &&
      req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query')
    );
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  toString() {
    return `<${this.identifier.type}:${this.identifier.id}>`;
  }
}
