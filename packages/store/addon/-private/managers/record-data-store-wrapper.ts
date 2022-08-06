import type { RelationshipDefinition } from '@ember-data/model/-private/relationship-meta';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import type {
  AttributesSchema,
  RelationshipSchema,
  RelationshipsSchema,
} from '@ember-data/types/q/record-data-schemas';
import type { RecordDataStoreWrapper as StoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';

import type { IdentifierCache } from '../caches/identifier-cache';
import type Store from '../store-service';
import constructResource from '../utils/construct-resource';

/**
  @module @ember-data/store
*/

function metaIsRelationshipDefinition(meta: RelationshipSchema): meta is RelationshipDefinition {
  return typeof (meta as RelationshipDefinition)._inverseKey === 'function';
}

export default class RecordDataStoreWrapper implements StoreWrapper {
  declare _willNotify: boolean;
  declare _pendingNotifies: Map<StableRecordIdentifier, Map<string, string>>;
  declare _store: Store;

  constructor(_store: Store) {
    this._store = _store;
    this._willNotify = false;
    this._pendingNotifies = new Map();
  }

  get identifierCache(): IdentifierCache {
    return this._store.identifierCache;
  }

  _scheduleNotification(identifier: StableRecordIdentifier, key: string, kind: 'belongsTo' | 'hasMany') {
    let pending = this._pendingNotifies.get(identifier);

    if (!pending) {
      pending = new Map();
      this._pendingNotifies.set(identifier, pending);
    }
    pending.set(key, kind);

    if (this._willNotify === true) {
      return;
    }

    this._willNotify = true;
    let backburner: any = this._store._backburner;

    backburner.schedule('notify', this, this._flushNotifications);
  }

  notifyErrorsChange(type: string, id: string, lid: string | null): void;
  notifyErrorsChange(type: string, id: string | null, lid: string): void;
  notifyErrorsChange(type: string, id: string | null, lid: string | null): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._store._notificationManager.notify(identifier, 'errors');
  }

  _flushNotifications(): void {
    if (this._willNotify === false) {
      return;
    }

    let pending = this._pendingNotifies;
    this._pendingNotifies = new Map();
    this._willNotify = false;

    pending.forEach((map, identifier) => {
      map.forEach((kind, key) => {
        this._store._notificationManager.notify(identifier, 'relationships', key);
      });
    });
  }

  attributesDefinitionFor(type: string): AttributesSchema {
    return this._store.getSchemaDefinitionService().attributesDefinitionFor({ type });
  }

  relationshipsDefinitionFor(type: string): RelationshipsSchema {
    return this._store.getSchemaDefinitionService().relationshipsDefinitionFor({ type });
  }

  inverseForRelationship(type: string, key: string): string | null {
    const modelClass = this._store.modelFor(type);
    const definition = this.relationshipsDefinitionFor(type)[key];
    if (!definition) {
      return null;
    }

    if (metaIsRelationshipDefinition(definition)) {
      return definition._inverseKey(this._store, modelClass);
    } else if (definition.options && definition.options.inverse !== undefined) {
      return definition.options.inverse;
    } else {
      return null;
    }
  }

  inverseIsAsyncForRelationship(type: string, key: string): boolean {
    const modelClass = this._store.modelFor(type);
    const definition = this.relationshipsDefinitionFor(type)[key];
    if (!definition) {
      return false;
    }

    if (definition.options && definition.options.inverse === null) {
      return false;
    }
    if ((definition as unknown as { inverseIsAsync?: boolean }).inverseIsAsync !== undefined) {
      // TODO do we need to amend the RFC for this prop?
      // else we should add it to the TS interface and document.
      return !!(definition as unknown as { inverseIsAsync: boolean }).inverseIsAsync;
    } else if (metaIsRelationshipDefinition(definition)) {
      return definition._inverseIsAsync(this._store, modelClass);
    } else {
      return false;
    }
  }

  notifyPropertyChange(type: string, id: string | null, lid: string, key?: string): void;
  notifyPropertyChange(type: string, id: string, lid: string | null | undefined, key?: string): void;
  notifyPropertyChange(type: string, id: string | null, lid: string | null | undefined, key?: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._store._notificationManager.notify(identifier, 'attributes', key);
  }

  notifyHasManyChange(type: string, id: string | null, lid: string, key: string): void;
  notifyHasManyChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyHasManyChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    this._scheduleNotification(identifier, key, 'hasMany');
  }

  notifyBelongsToChange(type: string, id: string | null, lid: string, key: string): void;
  notifyBelongsToChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyBelongsToChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._scheduleNotification(identifier, key, 'belongsTo');
  }

  notifyStateChange(type: string, id: string, lid: string | null, key?: string): void;
  notifyStateChange(type: string, id: string | null, lid: string, key?: string): void;
  notifyStateChange(type: string, id: string | null, lid: string | null, key?: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._store._notificationManager.notify(identifier, 'state');

    if (!key || key === 'isDeletionCommitted') {
      this._store.recordArrayManager.recordDidChange(identifier);
    }
  }

  recordDataFor(type: string, id: string, lid?: string | null): RecordData;
  recordDataFor(type: string, id: string | null, lid: string): RecordData;
  recordDataFor(type: string): RecordData;
  recordDataFor(type: string, id?: string | null, lid?: string | null): RecordData {
    // TODO @deprecate create capability. This is problematic because there's
    // no outside association between this RecordData and an Identifier. It's
    // likely a mistake but we said in an RFC we'd allow this. We should RFC
    // enforcing someone to use the record-data and identifier-cache APIs to
    // create a new identifier and then call clientDidCreate on the RecordData
    // instead.
    const identifier =
      !id && !lid
        ? this.identifierCache.createIdentifierForNewRecord({ type: type })
        : this.identifierCache.getOrCreateRecordIdentifier(constructResource(type, id, lid));

    const recordData = this._store._instanceCache.getRecordData(identifier);

    if (!id && !lid) {
      recordData.clientDidCreate();
      this._store.recordArrayManager.recordDidChange(identifier);
    }

    return recordData;
  }

  setRecordId(type: string, id: string, lid: string) {
    this._store._instanceCache.setRecordId(type, id, lid);
  }

  isRecordInUse(type: string, id: string | null, lid: string): boolean;
  isRecordInUse(type: string, id: string, lid?: string | null): boolean;
  isRecordInUse(type: string, id: string | null, lid?: string | null): boolean {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.peekRecordIdentifier(resource);

    const record = identifier && this._store._instanceCache.peek({ identifier, bucket: 'record' });

    return record ? !(record.isDestroyed || record.isDestroying) : false;
  }

  disconnectRecord(type: string, id: string | null, lid: string): void;
  disconnectRecord(type: string, id: string, lid?: string | null): void;
  disconnectRecord(type: string, id: string | null, lid?: string | null): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.peekRecordIdentifier(resource);

    if (identifier) {
      this._store._instanceCache.disconnect(identifier);
      this._pendingNotifies.delete(identifier);
    }
  }
}
