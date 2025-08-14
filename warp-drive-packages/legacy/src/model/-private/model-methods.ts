import { deprecate } from '@ember/debug';

import type { Store } from '@warp-drive/core';
import { recordIdentifierFor } from '@warp-drive/core';
import { ENABLE_LEGACY_REQUEST_METHODS } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';
import type { ChangedAttributesHash } from '@warp-drive/core/types/cache';
import { RecordStore } from '@warp-drive/core/types/symbols';

import type { Snapshot } from '../../compat/-private.ts';
import { FetchManager, upgradeStore } from '../../compat/-private.ts';
import type { Errors } from './errors.ts';
import { lookupLegacySupport } from './legacy-relationships-support.ts';
import type RecordState from './record-state.ts';
import type BelongsToReference from './references/belongs-to.ts';
import type HasManyReference from './references/has-many.ts';
import type { MaybeBelongsToFields, MaybeHasManyFields } from './type-utils.ts';

export interface MinimalLegacyRecord {
  errors: Errors;
  /** @internal */
  ___recordState: RecordState;
  currentState: RecordState;
  isDestroyed: boolean;
  isDestroying: boolean;
  isReloading: boolean;
  isValid: boolean;
  /** @internal */
  [RecordStore]: Store;

  deleteRecord(): void;
  unloadRecord(): void;
  save<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<this>;
  destroyRecord<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<this>;
}

export function rollbackAttributes<T extends MinimalLegacyRecord>(this: T): void {
  const { currentState } = this;
  const { isNew } = currentState;
  const store = this[RecordStore];

  store._join(() => {
    store.cache.rollbackAttrs(recordIdentifierFor(this));
    this.errors.clear();
    currentState.cleanErrorRequests();
    if (isNew) {
      this.unloadRecord();
    }
  });
}

export function unloadRecord<T extends MinimalLegacyRecord>(this: T): void {
  if (this.currentState.isNew && (this.isDestroyed || this.isDestroying)) {
    return;
  }
  this[RecordStore].unloadRecord(this);
}

export function belongsTo<T extends MinimalLegacyRecord, K extends MaybeBelongsToFields<T>>(
  this: T,
  prop: K
): BelongsToReference<T, K> {
  return lookupLegacySupport(this).referenceFor('belongsTo', prop) as BelongsToReference<T, K>;
}

export function hasMany<T extends MinimalLegacyRecord, K extends MaybeHasManyFields<T>>(
  this: T,
  prop: K
): HasManyReference<T, K> {
  return lookupLegacySupport(this).referenceFor('hasMany', prop) as HasManyReference<T, K>;
}

export function reload<T extends MinimalLegacyRecord>(this: T, options: Record<string, unknown> = {}): Promise<T> {
  if (!ENABLE_LEGACY_REQUEST_METHODS) {
    assert(`You cannot use reload() on a record when ENABLE_LEGACY_REQUEST_METHODS is false.`, false);
  } else {
    deprecate(`record.reload is deprecated, please use store.request to initiate a request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });

    return _reload.call(this, options) as Promise<T>;
  }
}

export function _reload<T extends MinimalLegacyRecord>(this: T, options: Record<string, unknown> = {}): Promise<T> {
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

export function changedAttributes<T extends MinimalLegacyRecord>(this: T): ChangedAttributesHash {
  return this[RecordStore].cache.changedAttrs(recordIdentifierFor(this));
}

export function serialize<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): unknown {
  upgradeStore(this[RecordStore]);
  return this[RecordStore].serializeRecord(this, options);
}

export function deleteRecord<T extends MinimalLegacyRecord>(this: T): void {
  // ensure we've populated currentState prior to deleting a new record
  if (this.currentState) {
    this[RecordStore].deleteRecord(this);
  }
}

export function save<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T> {
  if (!ENABLE_LEGACY_REQUEST_METHODS) {
    assert(`You cannot use save() on a record when ENABLE_LEGACY_REQUEST_METHODS is false.`, false);
  } else {
    deprecate(`record.save is deprecated, please use store.request to initiate a request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });

    return _save.call(this, options) as Promise<T>;
  }
}

export function _save<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T> {
  let promise: Promise<T>;

  if (this.currentState.isNew && this.currentState.isDeleted) {
    promise = Promise.resolve(this);
  } else {
    this.errors.clear();
    promise = this[RecordStore].saveRecord(this, options);
  }

  return promise;
}

export function destroyRecord<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T> {
  if (!ENABLE_LEGACY_REQUEST_METHODS) {
    assert(`You cannot use destroyRecord() on a record when ENABLE_LEGACY_REQUEST_METHODS is false.`, false);
  } else {
    deprecate(`record.destroyRecord is deprecated, please use store.request to initiate a request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });

    return _destroyRecord.call(this, options) as Promise<T>;
  }
}

export function _destroyRecord<T extends MinimalLegacyRecord>(this: T, options?: Record<string, unknown>): Promise<T> {
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

export function createSnapshot<T extends MinimalLegacyRecord>(this: T): Snapshot<T> {
  const store = this[RecordStore];

  upgradeStore(store);
  if (!store._fetchManager) {
    store._fetchManager = new FetchManager(store);
  }

  // @ts-expect-error Typescript isn't able to curry narrowed args that are divorced from each other.
  return store._fetchManager.createSnapshot<T>(recordIdentifierFor(this));
}
