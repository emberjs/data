import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import type { RelationshipDefinition } from '@ember-data/model/-private/system/relationships/relationship-meta';
import { HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';

import type { IdentifierCache } from '../../identifiers/cache';
import { identifierCacheFor } from '../../identifiers/cache';
import type { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import type { RecordData } from '../../ts-interfaces/record-data';
import type {
  AttributesSchema,
  RelationshipSchema,
  RelationshipsSchema,
} from '../../ts-interfaces/record-data-schemas';
import type { RecordDataStoreWrapper as StoreWrapper } from '../../ts-interfaces/record-data-store-wrapper';
import constructResource from '../../utils/construct-resource';
import type CoreStore from '../core-store';
import { internalModelFactoryFor } from './internal-model-factory';

/**
  @module @ember-data/store
*/

function metaIsRelationshipDefinition(meta: RelationshipSchema): meta is RelationshipDefinition {
  return typeof (meta as RelationshipDefinition)._inverseKey === 'function';
}

let peekGraph;
if (HAS_RECORD_DATA_PACKAGE) {
  let _peekGraph;
  peekGraph = (wrapper) => {
    _peekGraph = _peekGraph || require('@ember-data/record-data/-private').peekGraph;
    return _peekGraph(wrapper);
  };
}

export default class RecordDataStoreWrapper implements StoreWrapper {
  declare _willNotify: boolean;
  declare _pendingNotifies: Map<StableRecordIdentifier, Map<string, string>>;
  declare _store: CoreStore;

  constructor(_store: CoreStore) {
    this._store = _store;
    this._willNotify = false;
    this._pendingNotifies = new Map();
  }

  get identifierCache(): IdentifierCache {
    return identifierCacheFor(this._store);
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
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);

    let internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (internalModel) {
      internalModel.notifyErrorsChange();
    }
  }

  _flushNotifications(): void {
    if (this._willNotify === false) {
      return;
    }

    let pending = this._pendingNotifies;
    this._pendingNotifies = new Map();
    this._willNotify = false;
    const factory = internalModelFactoryFor(this._store);

    pending.forEach((map, identifier) => {
      const internalModel = factory.peek(identifier);
      if (internalModel) {
        map.forEach((kind, key) => {
          if (kind === 'belongsTo') {
            internalModel.notifyBelongsToChange(key);
          } else {
            internalModel.notifyHasManyChange(key);
          }
        });
      }
    });
  }

  attributesDefinitionFor(type: string): AttributesSchema {
    return this._store._attributesDefinitionFor(type);
  }

  relationshipsDefinitionFor(type: string): RelationshipsSchema {
    return this._store._relationshipsDefinitionFor(type);
  }

  inverseForRelationship(type: string, key: string): string | null {
    const modelClass = this._store.modelFor(type);
    const definition = this.relationshipsDefinitionFor(type)[key];
    if (!definition) {
      return null;
    }
    if (CUSTOM_MODEL_CLASS) {
      if (metaIsRelationshipDefinition(definition)) {
        return definition._inverseKey(this._store, modelClass);
      } else if (definition.options && definition.options.inverse !== undefined) {
        return definition.options.inverse;
      } else {
        return null;
      }
    } else {
      return (definition as RelationshipDefinition)._inverseKey(this._store, modelClass);
    }
  }

  inverseIsAsyncForRelationship(type: string, key: string): boolean {
    const modelClass = this._store.modelFor(type);
    const definition = this.relationshipsDefinitionFor(type)[key];
    if (!definition) {
      return false;
    }
    if (CUSTOM_MODEL_CLASS) {
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
    } else {
      return (definition as RelationshipDefinition)._inverseIsAsync(this._store, modelClass);
    }
  }

  notifyPropertyChange(type: string, id: string | null, lid: string, key: string): void;
  notifyPropertyChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyPropertyChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);
    let internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (internalModel) {
      internalModel.notifyPropertyChange(key);
    }
  }

  notifyHasManyChange(type: string, id: string | null, lid: string, key: string): void;
  notifyHasManyChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyHasManyChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);
    this._scheduleNotification(identifier, key, 'hasMany');
  }

  notifyBelongsToChange(type: string, id: string | null, lid: string, key: string): void;
  notifyBelongsToChange(type: string, id: string, lid: string | null | undefined, key: string): void;
  notifyBelongsToChange(type: string, id: string | null, lid: string | null | undefined, key: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);

    this._scheduleNotification(identifier, key, 'belongsTo');
  }

  notifyStateChange(type: string, id: string, lid: string | null, key?: string): void;
  notifyStateChange(type: string, id: string | null, lid: string, key?: string): void;
  notifyStateChange(type: string, id: string | null, lid: string | null, key?: string): void {
    const resource = constructResource(type, id, lid);
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);
    let internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (internalModel) {
      internalModel.notifyStateChange(key);
    }
  }

  recordDataFor(type: string, id: string, lid?: string | null): RecordData;
  recordDataFor(type: string, id: string | null, lid: string): RecordData;
  recordDataFor(type: string): RecordData;
  recordDataFor(type: string, id?: string | null, lid?: string | null): RecordData {
    let identifier: StableRecordIdentifier | { type: string };
    let isCreate: boolean = false;
    if (!id && !lid) {
      isCreate = true;
      identifier = { type };
    } else {
      const resource = constructResource(type, id, lid);
      identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);
    }

    return this._store.recordDataFor(identifier, isCreate);
  }

  setRecordId(type: string, id: string, lid: string) {
    this._store.setRecordId(type, id, lid);
  }

  isRecordInUse(type: string, id: string | null, lid: string): boolean;
  isRecordInUse(type: string, id: string, lid?: string | null): boolean;
  isRecordInUse(type: string, id: string | null, lid?: string | null): boolean {
    const resource = constructResource(type, id, lid);
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);
    const internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (!internalModel) {
      return false;
    }

    const record = internalModel._record;
    return record && !(record.isDestroyed || record.isDestroying);
  }

  disconnectRecord(type: string, id: string | null, lid: string): void;
  disconnectRecord(type: string, id: string, lid?: string | null): void;
  disconnectRecord(type: string, id: string | null, lid?: string | null): void {
    const resource = constructResource(type, id, lid);
    const identifier = identifierCacheFor(this._store).getOrCreateRecordIdentifier(resource);
    if (HAS_RECORD_DATA_PACKAGE) {
      let graph = peekGraph(this);
      if (graph) {
        graph.remove(identifier);
      }
    }
    let internalModel = internalModelFactoryFor(this._store).peek(identifier);
    if (internalModel) {
      internalModel.destroyFromRecordData();
    }
  }
}
