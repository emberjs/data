import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import type { StableDocumentIdentifier, StableRecordIdentifier } from '../../../types/identifier.ts';
import type { CacheCapabilitiesManager as StoreWrapper } from '../../-types/q/cache-capabilities-manager.ts';
import type { SchemaService } from '../../-types/q/schema-service.ts';
import type { IdentifierCache } from '../caches/identifier-cache.ts';
import { isDocumentIdentifier, isStableIdentifier } from '../caches/identifier-cache.ts';
import type { Store } from '../store-service.ts';
import type { NotificationType } from './notification-manager.ts';

export interface CacheCapabilitiesManager {
  getSchemaDefinitionService(): SchemaService;
}
export class CacheCapabilitiesManager implements StoreWrapper {
  declare _willNotify: boolean;
  declare _pendingNotifies: Map<StableRecordIdentifier, Set<string>>;
  declare _store: Store;

  constructor(_store: Store) {
    this._store = _store;
    this._willNotify = false;
    this._pendingNotifies = new Map();
  }

  get identifierCache(): IdentifierCache {
    return this._store.identifierCache;
  }

  _scheduleNotification(identifier: StableRecordIdentifier, key: string): void {
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

  notifyChange(identifier: StableRecordIdentifier, namespace: 'added' | 'removed', key: null): void;
  notifyChange(identifier: StableDocumentIdentifier, namespace: 'added' | 'updated' | 'removed', key: null): void;
  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key: string | null): void;
  notifyChange(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key: string | null
  ): void {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier) || isDocumentIdentifier(identifier));

    // TODO do we still get value from this?
    if (namespace === 'relationships' && key) {
      this._scheduleNotification(identifier as StableRecordIdentifier, key);
      return;
    }

    // @ts-expect-error
    this._store.notifications.notify(identifier, namespace, key);
  }

  get schema(): SchemaService {
    return this._store.schema;
  }

  setRecordId(identifier: StableRecordIdentifier, id: string): void {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));
    this._store._instanceCache.setRecordId(identifier, id);
  }

  hasRecord(identifier: StableRecordIdentifier): boolean {
    return Boolean(this._store._instanceCache.peek(identifier));
  }

  disconnectRecord(identifier: StableRecordIdentifier): void {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));
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
