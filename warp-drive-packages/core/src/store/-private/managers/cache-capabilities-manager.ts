import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import type { RequestKey, ResourceKey } from '../../../types/identifier.ts';
import type { CacheCapabilitiesManager as StoreWrapper } from '../../-types/q/cache-capabilities-manager.ts';
import type { SchemaService } from '../../../types/schema/schema-service.ts';
import type { PrivateStore, Store } from '../store-service.ts';
import type { CacheKeyManager } from './cache-key-manager.ts';
import { isRequestKey, isResourceKey } from './cache-key-manager.ts';
import type { NotificationType } from './notification-manager.ts';

export interface CacheCapabilitiesManager {
  /** @deprecated - use {@link CacheCapabilitiesManager.schema} */
  getSchemaDefinitionService(): SchemaService;
}
export class CacheCapabilitiesManager implements StoreWrapper {
  /** @internal */
  declare private _willNotify: boolean;

  /** @internal */
  declare private _pendingNotifies: Map<ResourceKey, Set<string>>;

  /** @internal */
  declare _store: Store;

  constructor(_store: Store) {
    this._store = _store;
    this._willNotify = false;
    this._pendingNotifies = new Map();
  }

  get cacheKeyManager(): CacheKeyManager {
    return this._store.cacheKeyManager;
  }

  /** @deprecated use {@link CacheCapabilitiesManager.cacheKeyManager} */
  get identifierCache(): CacheKeyManager {
    return this.cacheKeyManager;
  }

  /** @internal */
  private _scheduleNotification(identifier: ResourceKey, key: string): void {
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

  /** @internal */
  private _flushNotifications(): void {
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

  notifyChange(identifier: ResourceKey, namespace: 'added' | 'removed', key: null): void;
  notifyChange(identifier: RequestKey, namespace: 'added' | 'updated' | 'removed', key: null): void;
  notifyChange(identifier: ResourceKey, namespace: NotificationType, key: string | null): void;
  notifyChange(
    identifier: ResourceKey | RequestKey,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key: string | null
  ): void {
    assert(`Expected a stable identifier`, isResourceKey(identifier) || isRequestKey(identifier));

    // TODO do we still get value from this?
    if (namespace === 'relationships' && key) {
      this._scheduleNotification(identifier as ResourceKey, key);
      return;
    }

    // @ts-expect-error
    this._store.notifications.notify(identifier, namespace, key);
  }

  get schema(): SchemaService {
    return this._store.schema;
  }

  setRecordId(identifier: ResourceKey, id: string): void {
    assert(`Expected a stable identifier`, isResourceKey(identifier));
    this._store._instanceCache.setRecordId(identifier, id);
  }

  hasRecord(identifier: ResourceKey): boolean {
    return Boolean(this._store._instanceCache.peek(identifier));
  }

  disconnectRecord(identifier: ResourceKey): void {
    assert(`Expected a stable identifier`, isResourceKey(identifier));
    this._store._instanceCache.disconnect(identifier);
    this._pendingNotifies.delete(identifier);
  }
}

/**
 * This type exists for internal use only for
 * where intimate contracts still exist either for
 * the Test Suite or for Legacy code.
 *
 * @private
 */
export interface PrivateCacheCapabilitiesManager extends CacheCapabilitiesManager {
  _store: PrivateStore;
}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  CacheCapabilitiesManager.prototype.getSchemaDefinitionService = function () {
    // FIXME add deprecation for this
    return this.schema;
  };
}

export function assertPrivateCapabilities(manager: unknown): asserts manager is PrivateCacheCapabilitiesManager {}
