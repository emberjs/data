import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_V1CACHE_STORE_APIS } from '@ember-data/private-build-infra/deprecations';
import type { Cache } from '@ember-data/types/q/cache';
import type {
  LegacyCacheStoreWrapper,
  V2CacheStoreWrapper as StoreWrapper,
} from '@ember-data/types/q/cache-store-wrapper';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';
import { SchemaDefinitionService } from '@ember-data/types/q/schema-definition-service';

import { IdentifierCache, isStableIdentifier } from '../caches/identifier-cache';
import type Store from '../store-service';
import coerceId from '../utils/coerce-id';
import constructResource from '../utils/construct-resource';
import normalizeModelName from '../utils/normalize-model-name';
import { NotificationType } from './record-notification-manager';

/**
  @module @ember-data/store
*/

class LegacyWrapper implements LegacyCacheStoreWrapper {
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
    // it's possible a RecordData adhoc notifies us,
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

    let pending = this._pendingNotifies;
    this._pendingNotifies = new Map();
    this._willNotify = false;

    pending.forEach((set, identifier) => {
      set.forEach((key) => {
        this._store.notifications.notify(identifier, 'relationships', key);
      });
    });
  }

  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));

    // TODO do we still get value from this?
    if (namespace === 'relationships' && key) {
      this._scheduleNotification(identifier, key);
      return;
    }

    this._store.notifications.notify(identifier, namespace, key);

    if (namespace === 'state') {
      this._store.recordArrayManager.identifierChanged(identifier);
    }
  }

  notifyErrorsChange(type: string, id: string, lid: string | null): void;
  notifyErrorsChange(type: string, id: string | null, lid: string): void;
  notifyErrorsChange(type: string, id: string | null, lid: string | null): void {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(`StoreWrapper.notifyErrorsChange has been deprecated in favor of StoreWrapper.notifyChange`, false, {
        id: 'ember-data:deprecate-v1cache-store-apis',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    }
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._store.notifications.notify(identifier, 'errors');
  }

  attributesDefinitionFor(type: string): AttributesSchema {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(
        `StoreWrapper.attributesDefinitionFor has been deprecated in favor of StoreWrapper.getSchemaDefinitionService().attributesDefinitionFor`,
        false,
        {
          id: 'ember-data:deprecate-v1cache-store-apis',
          for: 'ember-data',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
        }
      );
    }
    return this._store.getSchemaDefinitionService().attributesDefinitionFor({ type });
  }

  relationshipsDefinitionFor(type: string): RelationshipsSchema {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(
        `StoreWrapper.relationshipsDefinitionFor has been deprecated in favor of StoreWrapper.getSchemaDefinitionService().relationshipsDefinitionFor`,
        false,
        {
          id: 'ember-data:deprecate-v1cache-store-apis',
          for: 'ember-data',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
        }
      );
    }
    return this._store.getSchemaDefinitionService().relationshipsDefinitionFor({ type });
  }

  getSchemaDefinitionService(): SchemaDefinitionService {
    return this._store.getSchemaDefinitionService();
  }

  notifyPropertyChange(type: string, id: string | null, lid: string, key?: string): void;
  notifyPropertyChange(type: string, id: string, lid: string | null | undefined, key?: string): void;
  notifyPropertyChange(type: string, id: string | null, lid: string | null | undefined, key?: string): void {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(`StoreWrapper.notifyPropertyChange has been deprecated in favor of StoreWrapper.notifyChange`, false, {
        id: 'ember-data:deprecate-v1cache-store-apis',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    }
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._store.notifications.notify(identifier, 'attributes', key);
  }

  notifyHasManyChange(type: string, id: string | null, lid: string, key: string): void;
  notifyHasManyChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyHasManyChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(`StoreWrapper.notifyHasManyChange has been deprecated in favor of StoreWrapper.notifyChange`, false, {
        id: 'ember-data:deprecate-v1cache-store-apis',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    }
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    this._scheduleNotification(identifier, key);
  }

  notifyBelongsToChange(type: string, id: string | null, lid: string, key: string): void;
  notifyBelongsToChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyBelongsToChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(`StoreWrapper.notifyBelongsToChange has been deprecated in favor of StoreWrapper.notifyChange`, false, {
        id: 'ember-data:deprecate-v1cache-store-apis',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    }
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._scheduleNotification(identifier, key);
  }

  notifyStateChange(type: string, id: string, lid: string | null, key?: string): void;
  notifyStateChange(type: string, id: string | null, lid: string, key?: string): void;
  notifyStateChange(type: string, id: string | null, lid: string | null, key?: string): void {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(`StoreWrapper.notifyStateChange has been deprecated in favor of StoreWrapper.notifyChange`, false, {
        id: 'ember-data:deprecate-v1cache-store-apis',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    }
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._store.notifications.notify(identifier, 'state');
    this._store.recordArrayManager.identifierChanged(identifier);
  }

  recordDataFor(type: string, id: string, lid?: string | null): Cache;
  recordDataFor(type: string, id: string | null, lid: string): Cache;
  recordDataFor(type: string): Cache;
  recordDataFor(type: StableRecordIdentifier): Cache;
  recordDataFor(type: string | StableRecordIdentifier, id?: string | null, lid?: string | null): Cache {
    let identifier: StableRecordIdentifier;
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      if (!isStableIdentifier(type)) {
        // we also deprecate create capability. This behavior was problematic because
        // there's no outside association between this RecordData and an Identifier.
        // It's likely a mistake when we hit this codepath, but we said in an early
        // RFC we'd allow this.
        // With V2 we are enforcing someone to use the record-data and identifier-cache APIs to
        // create a new identifier and then call clientDidCreate on the RecordData
        // instead.
        identifier =
          !id && !lid
            ? this.identifierCache.createIdentifierForNewRecord({ type: type })
            : this.identifierCache.getOrCreateRecordIdentifier(constructResource(type, id, lid));
      } else {
        identifier = type;
      }
    } else {
      assert(`Expected a stable identifier`, isStableIdentifier(type));
      identifier = type;
    }

    const recordData = this._store._instanceCache.getRecordData(identifier);

    if (!id && !lid) {
      recordData.clientDidCreate(identifier);
      this._store.recordArrayManager.identifierAdded(identifier);
    }

    return recordData;
  }

  setRecordId(type: string | StableRecordIdentifier, id: string, lid?: string) {
    let identifier: StableRecordIdentifier | undefined;
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      if (!isStableIdentifier(type)) {
        const modelName = normalizeModelName(type);
        const resource = constructResource(modelName, null, coerceId(lid));
        identifier = this.identifierCache.peekRecordIdentifier(resource);
      } else {
        identifier = type;
      }
    } else {
      assert(`Expected a stable identifier`, isStableIdentifier(type));
      identifier = type;
    }

    assert(`Unable to find an identifier to update the ID for for ${String(lid)}`, identifier);

    this._store._instanceCache.setRecordId(identifier, id);
  }

  isRecordInUse(type: string, id: string | null, lid: string): boolean;
  isRecordInUse(type: string, id: string, lid?: string | null): boolean;
  isRecordInUse(type: string, id: string | null, lid?: string | null): boolean {
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      deprecate(`StoreWrapper.isRecordInUSe has been deprecated in favor of StoreWrapper.hasRecord`, false, {
        id: 'ember-data:deprecate-v1cache-store-apis',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    }
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.peekRecordIdentifier(resource);

    const record = identifier && this._store._instanceCache.peek({ identifier, bucket: 'record' });

    return record ? !(record.isDestroyed || record.isDestroying) : false;
  }

  hasRecord(identifier: StableRecordIdentifier): boolean {
    return Boolean(this._store._instanceCache.peek({ identifier, bucket: 'record' }));
  }

  disconnectRecord(type: string, id: string | null, lid: string): void;
  disconnectRecord(type: string, id: string, lid?: string | null): void;
  disconnectRecord(type: StableRecordIdentifier): void;
  disconnectRecord(type: string | StableRecordIdentifier, id?: string | null, lid?: string | null): void {
    let identifier: StableRecordIdentifier;
    if (DEPRECATE_V1CACHE_STORE_APIS) {
      if (typeof type === 'string') {
        deprecate(
          `StoreWrapper.disconnectRecord(<type>) has been deprecated in favor of StoreWrapper.disconnectRecord(<identifier>)`,
          false,
          {
            id: 'ember-data:deprecate-v1cache-store-apis',
            for: 'ember-data',
            until: '5.0',
            since: { enabled: '4.7', available: '4.7' },
          }
        );
        let resource = constructResource(type, id, lid) as RecordIdentifier;
        identifier = this.identifierCache.peekRecordIdentifier(resource)!;
      } else {
        identifier = type;
      }
    } else {
      identifier = type as StableRecordIdentifier;
    }

    assert(`Expected a stable identifier`, isStableIdentifier(identifier));

    this._store._instanceCache.disconnect(identifier);
    this._pendingNotifies.delete(identifier);
  }
}

class V2CacheStoreWrapper implements StoreWrapper {
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

    let pending = this._pendingNotifies;
    this._pendingNotifies = new Map();
    this._willNotify = false;

    pending.forEach((set, identifier) => {
      set.forEach((key) => {
        this._store.notifications.notify(identifier, 'relationships', key);
      });
    });
  }

  notifyChange(identifier: StableRecordIdentifier, namespace: NotificationType, key?: string): void {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));

    // TODO do we still get value from this?
    if (namespace === 'relationships' && key) {
      this._scheduleNotification(identifier, key);
      return;
    }

    this._store.notifications.notify(identifier, namespace, key);

    if (namespace === 'state') {
      this._store.recordArrayManager.identifierChanged(identifier);
    }
  }

  getSchemaDefinitionService(): SchemaDefinitionService {
    return this._store.getSchemaDefinitionService();
  }

  recordDataFor(identifier: StableRecordIdentifier): Cache {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));

    return this._store._instanceCache.getRecordData(identifier);
  }

  setRecordId(identifier: StableRecordIdentifier, id: string) {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));
    this._store._instanceCache.setRecordId(identifier, id);
  }

  hasRecord(identifier: StableRecordIdentifier): boolean {
    return Boolean(this._store._instanceCache.peek({ identifier, bucket: 'record' }));
  }

  disconnectRecord(identifier: StableRecordIdentifier): void {
    assert(`Expected a stable identifier`, isStableIdentifier(identifier));
    this._store._instanceCache.disconnect(identifier);
    this._pendingNotifies.delete(identifier);
  }
}
export type CacheStoreWrapper = LegacyWrapper | V2CacheStoreWrapper;

export const CacheStoreWrapper = DEPRECATE_V1CACHE_STORE_APIS ? LegacyWrapper : V2CacheStoreWrapper;
