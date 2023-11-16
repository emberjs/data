import { assert } from '@ember/debug';

import type { StableDocumentIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';

import type { CacheCapabilitiesManager as StoreWrapper } from '../../-types/q/cache-store-wrapper';
import type { SchemaService } from '../../-types/q/schema-service';
import type { IdentifierCache } from '../caches/identifier-cache';
import { isDocumentIdentifier, isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';
import type { NotificationType } from './notification-manager';

/**
  @module @ember-data/store
*/

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

  _scheduleNotification(identifier: StableRecordIdentifier, key: string) {
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

  notifyChange(identifier: StableRecordIdentifier, namespace: 'added' | 'removed'): void;
  notifyChange(identifier: StableDocumentIdentifier, namespace: 'added' | 'updated' | 'removed'): void;
  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void;
  notifyChange(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    namespace: NotificationType | 'added' | 'removed' | 'updated',
    key?: string
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

  getSchemaDefinitionService(): SchemaService {
    return this._store.getSchemaDefinitionService();
  }

  get schema() {
    return this._store.schema;
  }

  setRecordId(identifier: StableRecordIdentifier, id: string) {
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
