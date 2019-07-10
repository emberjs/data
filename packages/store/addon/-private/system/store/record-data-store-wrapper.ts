import { RecordDataStoreWrapper as IRecordDataStoreWrapper } from '../../ts-interfaces/record-data-store-wrapper';
import Store from '../store';
import { AttributesSchema, RelationshipsSchema } from '../../ts-interfaces/record-data-schemas';
import { BRAND_SYMBOL } from '../../ts-interfaces/utils/brand';
import { upgradeForInternal } from '../ts-upgrade-map';
import RecordData from '../../ts-interfaces/record-data';

type Store = InstanceType<typeof Store>;
type StringOrNullOrUndefined = string | null | undefined;

export default class RecordDataStoreWrapper implements IRecordDataStoreWrapper {
  [BRAND_SYMBOL]: 'RecordDataStoreWrapper';
  _store: Store;
  _willUpdateManyArrays: boolean;
  private _pendingManyArrayUpdates: StringOrNullOrUndefined[];

  constructor(store: Store) {
    this._store = store;
    this._willUpdateManyArrays = false;
    this._pendingManyArrayUpdates = [];
  }

  /**
   * Exists so that DefaultRecordData can check for model types
   * in DEBUG for relationships. Should be refactored away.
   *
   * @internal
   */
  _hasModelFor(modelName: string) {
    return this._store._hasModelFor(modelName);
  }

  /**
   * @internal
   */
  _scheduleManyArrayUpdate(modelName: string, id: string | null, clientId: string, key: string): void;
  _scheduleManyArrayUpdate(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  _scheduleManyArrayUpdate(modelName: string, id: string | null, clientId: string | null | undefined, key: string) {
    let pending = (this._pendingManyArrayUpdates = this._pendingManyArrayUpdates || []);
    pending.push(modelName, id, clientId, key);

    if (this._willUpdateManyArrays === true) {
      return;
    }

    this._willUpdateManyArrays = true;
    let backburner: any = this._store._backburner;

    backburner.join(() => {
      backburner.schedule('syncRelationships', this, this._flushPendingManyArrayUpdates);
    });
  }

  notifyErrorsChange(modelName: string, id: string | null, clientId: string | null) {
    let internalModel = this._store._getInternalModelForId(modelName, id, clientId);
    internalModel.notifyErrorsChange();
  }

  _flushPendingManyArrayUpdates(): void {
    if (this._willUpdateManyArrays === false) {
      return;
    }

    let pending = this._pendingManyArrayUpdates;
    this._pendingManyArrayUpdates = [];
    this._willUpdateManyArrays = false;
    let store = this._store;

    for (let i = 0; i < pending.length; i += 4) {
      let modelName = pending[i];
      let id = pending[i + 1];
      let clientId = pending[i + 2];
      let key = pending[i + 3];
      let internalModel = store._getInternalModelForId(modelName, id, clientId);
      internalModel.notifyHasManyChange(key);
    }
  }

  attributesDefinitionFor(modelName: string): AttributesSchema {
    return this._store._attributesDefinitionFor(modelName);
  }

  relationshipsDefinitionFor(modelName: string): RelationshipsSchema {
    return this._store._relationshipsDefinitionFor(modelName);
  }

  inverseForRelationship(modelName: string, key: string): string {
    const modelClass = this._store.modelFor(modelName);
    const definition = upgradeForInternal(this.relationshipsDefinitionFor(modelName)[key]);

    return definition._inverseKey(this._store, modelClass);
  }

  inverseIsAsyncForRelationship(modelName: string, key: string): boolean {
    const modelClass = this._store.modelFor(modelName);
    const definition = upgradeForInternal(this.relationshipsDefinitionFor(modelName)[key]);

    return definition._inverseIsAsync(this._store, modelClass);
  }

  notifyPropertyChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyPropertyChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyPropertyChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void {
    if (assertValidId(id, clientId)) {
      let internalModel = this._store._getInternalModelForId(modelName, id, clientId);
      internalModel.notifyPropertyChange(key);
    }
  }

  notifyHasManyChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyHasManyChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyHasManyChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void {
    if (assertValidId(id, clientId)) {
      this._scheduleManyArrayUpdate(modelName, id, clientId, key);
    }
  }

  notifyBelongsToChange(modelName: string, id: string | null, clientId: string, key: string): void;
  notifyBelongsToChange(modelName: string, id: string, clientId: string | null | undefined, key: string): void;
  notifyBelongsToChange(modelName: string, id: string | null, clientId: string | null | undefined, key: string): void {
    if (assertValidId(id, clientId)) {
      let internalModel = this._store._getInternalModelForId(modelName, id, clientId);
      internalModel.notifyBelongsToChange(key);
    }
  }

  notifyStateChange(modelName: string, id: string | null, clientId: string | null, key?: string): void {
    let internalModel = this._store._getInternalModelForId(modelName, id, clientId);
    if (internalModel) {
      internalModel.notifyStateChange(key);
    }
  }

  recordDataFor(modelName: string, id: string | null, clientId: string): RecordData;
  recordDataFor(modelName: string, id: string, clientId: string | null | undefined): RecordData;
  recordDataFor(modelName: string, id: string | null, clientId: string | null | undefined) {
    if (assertValidId(id, clientId)) {
      return this._store.recordDataFor(modelName, id, clientId);
    }
  }

  setRecordId(modelName: string, id: string, clientId: string) {
    this._store.setRecordId(modelName, id, clientId);
  }

  isRecordInUse(modelName: string, id: string | null, clientId: string): boolean;
  isRecordInUse(modelName: string, id: string, clientId?: string | null): boolean;
  isRecordInUse(modelName: string, id: string | null, clientId?: string | null) {
    if (assertValidId(id, clientId)) {
      let internalModel = this._store._getInternalModelForId(modelName, id, clientId);
      if (!internalModel) {
        return false;
      }
      return internalModel.isRecordInUse();
    }
  }

  disconnectRecord(modelName: string, id: string | null, clientId: string): void;
  disconnectRecord(modelName: string, id: string, clientId?: string | null): void;
  disconnectRecord(modelName: string, id: string | null, clientId?: string | null) {
    if (assertValidId(id, clientId)) {
      let internalModel = this._store._getInternalModelForId(modelName, id, clientId);
      if (internalModel) {
        internalModel.destroyFromRecordData();
      }
    }
  }
}

function assertValidId(id?: string | null, clientId?: string | null): id is string {
  // weed out anything falsey
  if (!id && !clientId) {
    throw new Error(`Either an id or a clientId is required as an argument.`);
  }
  return true;
}
