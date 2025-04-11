import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/build-config/macros';
import type { RequestCacheKey, ResourceCacheKey } from '@warp-drive/core-types/identifier';

import type { CacheCapabilitiesManager as StoreWrapper } from '../../-types/q/cache-capabilities-manager';
import type { SchemaService } from '../../-types/q/schema-service';
import type { IdentifierCache } from '../caches/identifier-cache';
import { isRequestCacheKey, isResourceCacheKey } from '../caches/identifier-cache';
import type { Store } from '../store-service';
import type { NotificationType } from './notification-manager';

/**
  @module @ember-data/store
*/

export interface CacheCapabilitiesManager {
  getSchemaDefinitionService(): SchemaService;
}
export class CacheCapabilitiesManager implements StoreWrapper {
  declare _willNotify: boolean;
  declare _pendingNotifies: Map<ResourceCacheKey, Set<string>>;
  declare _store: Store;

  constructor(_store: Store) {
    this._store = _store;
    this._willNotify = false;
    this._pendingNotifies = new Map();
  }

  get identifierCache(): IdentifierCache {
    return this._store.identifierCache;
  }

  _scheduleNotification(identifier: ResourceCacheKey, key: string) {
    let pending = this._pendingNotifies.get(identifier);

    if (!pending) {
      pending = new Set();
      this._pendingNotifies.set(identifier, pending);
    }
    pending.add(key);

    if (this._willNotify === true) {
      return;
    }

    this._willNotify = true;
    // it's possible a cache adhoc notifies us,
    // in which case we sync flush
    if (this._store._cbs) {
      this._store._schedule('notify', () => this._flushNotifications());
    } else {
      // TODO @runspired determine if relationship mutations should schedule
      // into join/run vs immediate flush
      this._flushNotifications();
    }
  }

  _flushNotifications(): void {
    if (this._willNotify === false) {
      return;
    }

    const pending = this._pendingNotifies;
    this._pendingNotifies = new Map();
    this._willNotify = false;

    pending.forEach((set, identifier) => {
      set.forEach((key) => {
        this._store.notifications.notify(identifier, 'relationships', key);
      });
    });
  }

  notifyChange(identifier: ResourceCacheKey, namespace: 'added' | 'removed', key: null): void;
  notifyChange(identifier: RequestCacheKey, namespace: 'added' | 'updated' | 'removed', key: null): void;
  notifyChange(identifier: ResourceCacheKey, namespace: NotificationType, key: string | null): void;
  notifyChange(
    identifier: ResourceCacheKey | RequestCacheKey,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key: string | null
  ): void {
    assert(`Expected a stable identifier`, isResourceCacheKey(identifier) || isRequestCacheKey(identifier));

    // TODO do we still get value from this?
    if (namespace === 'relationships' && key) {
      this._scheduleNotification(identifier as ResourceCacheKey, key);
      return;
    }

    // @ts-expect-error
    this._store.notifications.notify(identifier, namespace, key);
  }

  get schema() {
    return this._store.schema;
  }

  setRecordId(identifier: ResourceCacheKey, id: string) {
    assert(`Expected a stable identifier`, isResourceCacheKey(identifier));
    this._store._instanceCache.setRecordId(identifier, id);
  }

  hasRecord(identifier: ResourceCacheKey): boolean {
    return Boolean(this._store._instanceCache.peek(identifier));
  }

  disconnectRecord(identifier: ResourceCacheKey): void {
    assert(`Expected a stable identifier`, isResourceCacheKey(identifier));
    this._store._instanceCache.disconnect(identifier);
    this._pendingNotifies.delete(identifier);
  }
}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  CacheCapabilitiesManager.prototype.getSchemaDefinitionService = function () {
    // FIXME add deprecation for this
    return this._store.schema;
  };
}
