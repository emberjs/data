import { assert } from '@ember/debug';

import { importSync } from '@embroider/macros';

import { upgradeStore } from '@ember-data/legacy-compat/-private';
import Store, { recordIdentifierFor } from '@ember-data/store';
import { peekCache } from '@ember-data/store/-private';
import { RecordStore } from '@warp-drive/core-types/symbols';

import Errors from './errors';
import { lookupLegacySupport } from './legacy-relationships-support';
import RecordState from './record-state';

export interface MinimalLegacyRecord {
  errors: Errors;
  ___recordState: RecordState;
  currentState: RecordState;
  isDestroyed: boolean;
  isDestroying: boolean;
  isReloading: boolean;
  [RecordStore]: Store;

  deleteRecord(): void;
  unloadRecord(): void;
  save<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T>;
  destroyRecord<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T>;
}

export function rollbackAttributes(this: MinimalLegacyRecord) {
  const { currentState } = this;
  const { isNew } = currentState;

  this[RecordStore]._join(() => {
    peekCache(this).rollbackAttrs(recordIdentifierFor(this));
    this.errors.clear();
    currentState.cleanErrorRequests();
    if (isNew) {
      this.unloadRecord();
    }
  });
}

export function unloadRecord(this: MinimalLegacyRecord) {
  if (this.currentState.isNew && (this.isDestroyed || this.isDestroying)) {
    return;
  }
  this[RecordStore].unloadRecord(this);
}

export function belongsTo(this: MinimalLegacyRecord, prop: string) {
  return lookupLegacySupport(this).referenceFor('belongsTo', prop);
}

export function hasMany(this: MinimalLegacyRecord, prop: string) {
  return lookupLegacySupport(this).referenceFor('hasMany', prop);
}

export function reload(this: MinimalLegacyRecord, options: Record<string, unknown> = {}) {
  options.isReloading = true;
  options.reload = true;

  const identifier = recordIdentifierFor(this);
  assert(`You cannot reload a record without an ID`, identifier.id);

  this.isReloading = true;
  const promise = this[RecordStore].request({
    op: 'findRecord',
    data: {
      options,
      record: identifier,
    },
    cacheOptions: { [Symbol.for('wd:skip-cache')]: true },
  })
    .then(() => this)
    .finally(() => {
      this.isReloading = false;
    });

  return promise;
}

export function changedAttributes(this: MinimalLegacyRecord) {
  return peekCache(this).changedAttrs(recordIdentifierFor(this));
}

export function serialize(this: MinimalLegacyRecord, options?: Record<string, unknown>) {
  upgradeStore(this[RecordStore]);
  return this[RecordStore].serializeRecord(this, options);
}

export function deleteRecord(this: MinimalLegacyRecord) {
  // ensure we've populated currentState prior to deleting a new record
  if (this.currentState) {
    this[RecordStore].deleteRecord(this);
  }
}

export function save<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T> {
  let promise: Promise<T>;

  if (this.currentState.isNew && this.currentState.isDeleted) {
    promise = Promise.resolve(this);
  } else {
    this.errors.clear();
    promise = this[RecordStore].saveRecord(this, options) as Promise<T>;
  }

  return promise;
}

export function destroyRecord(this: MinimalLegacyRecord, options?: Record<string, unknown>) {
  const { isNew } = this.currentState;
  this.deleteRecord();
  if (isNew) {
    return Promise.resolve(this);
  }
  return this.save(options).then((_) => {
    this.unloadRecord();
    return this;
  });
}

export function createSnapshot(this: MinimalLegacyRecord) {
  const store = this[RecordStore];

  upgradeStore(store);
  if (!store._fetchManager) {
    const FetchManager = (
      importSync('@ember-data/legacy-compat/-private') as typeof import('@ember-data/legacy-compat/-private')
    ).FetchManager;
    store._fetchManager = new FetchManager(store);
  }

  return store._fetchManager.createSnapshot(recordIdentifierFor(this));
}
