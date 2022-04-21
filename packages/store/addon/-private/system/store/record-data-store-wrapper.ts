import { assert } from '@ember/debug';

import { importSync } from '@embroider/macros';

import type { RelationshipDefinition } from '@ember-data/model/-private/system/relationships/relationship-meta';
import { HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import type { DefaultRegistry, ResolvedRegistry } from '@ember-data/types';
import type { RecordField, RecordType } from '@ember-data/types/utils';

import type { IdentifierCache } from '../../identifiers/cache';
import type { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import type { RecordData } from '../../ts-interfaces/record-data';
import type {
  AttributesSchema,
  RelationshipSchema,
  RelationshipsSchema,
} from '../../ts-interfaces/record-data-schemas';
import type { RecordDataStoreWrapper as StoreWrapper } from '../../ts-interfaces/record-data-store-wrapper';
import constructResource from '../../utils/construct-resource';
import type Store from '../store';
import { internalModelFactoryFor } from './internal-model-factory';

/**
  @module @ember-data/store
*/

function metaIsRelationshipDefinition<R extends ResolvedRegistry, T extends RecordType<R>, K extends RecordField<R, T>>(
  meta: RelationshipSchema<R, T, K>
): meta is RelationshipDefinition<R, T, K> {
  return typeof (meta as RelationshipDefinition<R, T, K>)._inverseKey === 'function';
}

let peekGraph;
if (HAS_RECORD_DATA_PACKAGE) {
  let _peekGraph;
  peekGraph = (wrapper) => {
    _peekGraph =
      _peekGraph ||
      (importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')).peekGraph;
    return _peekGraph(wrapper);
  };
}

type RelKind = 'belongsTo' | 'hasMany';

interface RecordMap<R extends ResolvedRegistry> {
  clear(): void;
  delete(key: StableRecordIdentifier<RecordType<R>>): boolean;
  forEach(
    callbackfn: <K extends RecordType<R>>(
      value: Map<RecordField<R, K>, RelKind>,
      key: StableRecordIdentifier<K>,
      map: RecordMap<R>
    ) => void,
    thisArg?: unknown
  ): void;
  get<K extends RecordType<R>>(key: StableRecordIdentifier<K>): Map<RecordField<R, K>, RelKind> | undefined;
  has<K extends RecordType<R>>(key: StableRecordIdentifier<K>): boolean;
  set<K extends RecordType<R>>(key: StableRecordIdentifier<K>, value: Map<RecordField<R, K>, RelKind>): this;
  readonly size: number;
}

export default class RecordDataStoreWrapper<R extends ResolvedRegistry = ResolvedRegistry<DefaultRegistry>>
  implements StoreWrapper
{
  declare _willNotify: boolean;
  declare _pendingNotifies: RecordMap<R>;
  declare _store: Store<R>;

  constructor(_store: Store<R>) {
    this._store = _store;
    this._willNotify = false;
    this._pendingNotifies = new Map();
  }

  get identifierCache(): IdentifierCache<R> {
    return this._store.identifierCache;
  }

  _scheduleNotification<T extends RecordType<R>>(
    identifier: StableRecordIdentifier<T>,
    key: RecordField<R, T>,
    kind: 'belongsTo' | 'hasMany'
  ) {
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

  notifyErrorsChange<T extends RecordType<R>>(type: T, id: string, lid: string | null): void;
  notifyErrorsChange<T extends RecordType<R>>(type: T, id: string | null, lid: string): void;
  notifyErrorsChange<T extends RecordType<R>>(type: T, id: string | null, lid: string | null): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

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

  attributesDefinitionFor<T extends RecordType<R>>(type: T): AttributesSchema<R, T> {
    return this._store._attributesDefinitionFor({ type });
  }

  relationshipsDefinitionFor<T extends RecordType<R>>(type: T): RelationshipsSchema<R, T> {
    return this._store._relationshipsDefinitionFor({ type });
  }

  inverseForRelationship<T extends RecordType<R>>(type: T, key: RecordField<R, T>): string | null {
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

  inverseIsAsyncForRelationship<T extends RecordType<R>>(type: T, key: RecordField<R, T>): boolean {
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

  notifyPropertyChange<T extends RecordType<R>>(type: T, id: string | null, lid: string, key: RecordField<R, T>): void;
  notifyPropertyChange<T extends RecordType<R>>(
    type: T,
    id: string,
    lid: string | null | undefined,
    key: RecordField<R, T>
  ): void;
  notifyPropertyChange<T extends RecordType<R>>(
    type: T,
    id: string | null,
    lid: string | null | undefined,
    key: RecordField<R, T>
  ): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    let internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (internalModel) {
      internalModel.notifyPropertyChange(key);
    }
  }

  notifyHasManyChange<T extends RecordType<R>>(type: T, id: string | null, lid: string, key: RecordField<R, T>): void;
  notifyHasManyChange<T extends RecordType<R>>(
    type: T,
    id: string,
    lid: string | null | undefined,
    key: RecordField<R, T>
  ): void;
  notifyHasManyChange<T extends RecordType<R>>(
    type: T,
    id: string | null,
    lid: string | null | undefined,
    key: RecordField<R, T>
  ): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    this._scheduleNotification(identifier, key, 'hasMany');
  }

  notifyBelongsToChange<T extends RecordType<R>>(type: T, id: string | null, lid: string, key: RecordField<R, T>): void;
  notifyBelongsToChange<T extends RecordType<R>>(
    type: T,
    id: string,
    lid: string | null | undefined,
    key: RecordField<R, T>
  ): void;
  notifyBelongsToChange<T extends RecordType<R>>(
    type: T,
    id: string | null,
    lid: string | null | undefined,
    key: RecordField<R, T>
  ): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);

    this._scheduleNotification(identifier, key, 'belongsTo');
  }

  // TODO RecordField might not be right here
  notifyStateChange<T extends RecordType<R>>(type: T, id: string, lid: string | null, key?: RecordField<R, T>): void;
  notifyStateChange<T extends RecordType<R>>(type: T, id: string | null, lid: string, key?: RecordField<R, T>): void;
  notifyStateChange<T extends RecordType<R>>(
    type: T,
    id: string | null,
    lid: string | null,
    key?: RecordField<R, T>
  ): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    let internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (internalModel) {
      internalModel.notifyStateChange(key);
    }
  }

  recordDataFor<T extends RecordType<R>>(type: T, id: string, lid?: string | null): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T, id: string | null, lid: string): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T): RecordData<R, T>;
  recordDataFor<T extends RecordType<R>>(type: T, id?: string | null, lid?: string | null): RecordData<R, T> {
    let identifier: StableRecordIdentifier<T> | { type: T };
    let isCreate: boolean = false;
    if (!id && !lid) {
      isCreate = true;
      identifier = { type };
    } else {
      const resource = constructResource(type, id, lid);
      identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    }

    return this._store.recordDataFor(identifier, isCreate);
  }

  setRecordId(type: string, id: string, lid: string) {
    this._store.setRecordId(type, id, lid);
  }

  isRecordInUse<T extends RecordType<R>>(type: T, id: string | null, lid: string): boolean;
  isRecordInUse<T extends RecordType<R>>(type: T, id: string, lid?: string | null): boolean;
  isRecordInUse<T extends RecordType<R>>(type: T, id: string | null, lid?: string | null): boolean {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    const internalModel = internalModelFactoryFor(this._store).peek(identifier);

    if (!internalModel) {
      return false;
    }

    const record = internalModel._record;
    // TODO should we utilize the destroyables RFC here for records ?
    assert(
      `Record should implement destroyable behavior`,
      !record || 'isDestroyed' in record || 'isDestroyng' in record
    );
    return (
      !!record &&
      !(
        (record as unknown as { isDestroyed: boolean }).isDestroyed ||
        (record as unknown as { isDestroying: boolean }).isDestroying
      )
    );
  }

  disconnectRecord<T extends RecordType<R>>(type: T, id: string | null, lid: string): void;
  disconnectRecord<T extends RecordType<R>>(type: T, id: string, lid?: string | null): void;
  disconnectRecord<T extends RecordType<R>>(type: T, id: string | null, lid?: string | null): void {
    const resource = constructResource(type, id, lid);
    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
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
