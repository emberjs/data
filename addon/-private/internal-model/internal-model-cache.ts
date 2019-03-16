import { Dict } from '../ts-interfaces/utils';
import { StableRecordIdentifier } from '../ts-interfaces/identifier';
import IdentifierCache from '../identifiers/cache';
import InternalModel from '../system/model/internal-model';
import { assert } from '@ember/debug';
import { NewResourceObject, ExistingResourceIdentifierObject } from '../ts-interfaces/json-api';

export default class InternalModelCache {
  private _identifierCache: IdentifierCache;
  private _types: Dict<string, InternalModel[]> = Object.create(null);
  private _lids: Dict<string, InternalModel> = Object.create(null)
  private _store;

  constructor(store, identifierCache) {
    this._identifierCache = identifierCache;
    this._store = store;
  }

  all(modelName: string) {
    let all = this._types[modelName] = this._types[modelName] || [];
    return all;
  }
  
  get(identifier: StableRecordIdentifier): InternalModel | null {
    return this._lids[identifier.lid] || null;
  }

  private _set(identifier: StableRecordIdentifier, internalModel: InternalModel): void {
    this._lids[identifier.lid] = internalModel;
    this.all(identifier.type).push(internalModel);
  }

  createInternalModelForNewRecord(data: NewResourceObject): InternalModel {
    // check for an existing identifier
    let identifier;
    let internalModel;

    if (data.id !== null) {
      identifier = this._identifierCache.peekRecordIdentifier(data as ExistingResourceIdentifierObject, false);
      internalModel = identifier !== null ? this.get(identifier) : null;
    }

    if (internalModel && internalModel.hasScheduledDestroy()) {
      // unloadRecord is async, if one attempts to unload + then sync create,
      //   we must ensure the unload is complete before starting the create
      //   The push path will utilize _getOrCreateInternalModelFor()
      //   which will call `cancelDestroy` instead for this unload + then
      //   sync push scenario. Once we have true client-side
      //   delete signaling, we should never call destroySync
      internalModel.destroySync();
      internalModel = null;
      this._identifierCache.forgetRecordIdentifier(identifier);
    }

    assert(
      `The id ${identifier.id} has already been used with another record for modelClass '${
        identifier.type
      }'.`,
      !internalModel
    );

    identifier = this._identifierCache.createIdentifierForNewRecord({
      type: data.type,
      id: data.id
    });

    internalModel = new InternalModel(this._store, identifier);
    this._set(identifier, internalModel);

    return internalModel;
  }

  ensureInstance(identifier: StableRecordIdentifier): InternalModel {
    let internalModel = this.get(identifier);

    if (internalModel !== null) {
      // unloadRecord is async, if one attempts to unload + then sync push,
      //   we must ensure the unload is canceled before continuing
      //   The createRecord path will utilize _createInternalModel() directly
      //   which will call `destroySync` instead for this unload + then
      //   sync createRecord scenario. Once we have true client-side
      //   delete signaling, we should never call destroySync
      if (internalModel.hasScheduledDestroy()) {
        internalModel.cancelDestroy();
      }

      return internalModel;
    }

    internalModel = new InternalModel(this._store, identifier);
    this._set(identifier, internalModel);

    return internalModel;
  }

  clear(type?: string) {
    let cached: InternalModel[] = [];

    if (type !== undefined) {
      let all = this.all(type);
      this._types[type] = []; // clear it
      cached.push(...all);
    } else {
      Object.keys(this._types).forEach(type => {
        cached.push(...this.all(type));
        this._types[type] = []; // clear it
      });
    }

    for (let i = 0; i < cached.length; i++) {
      let internalModel = cached[i];
      
      // this then calls "remove"
      // but only once the time is right
      internalModel.unloadRecord();
    }
  }

  remove(identifier: StableRecordIdentifier) {
    let internalModel = this._lids[identifier.lid];
    delete this._lids[identifier.lid];
    let all = this.all(identifier.type);
    let index = all.indexOf(internalModel);
    if (index !== -1) {
      all.splice(index, 1);
    }
  }
}