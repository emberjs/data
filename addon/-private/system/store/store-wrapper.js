export default class StoreWrapper {
  constructor(store) {
    this.store = store;
    this._willUpdateManyArrays = false;
    this._pendingManyArrayUpdates = null;
  }

  // TODO this exists just to the default recordData can
  //  check this in debug for relationships
  //  we can likely do away with this in the new relationship layer
  _hasModelFor(modelName) {
    return this.store._hasModelFor(modelName);
  }

  _scheduleManyArrayUpdate(identifier, key) {
    let pending = (this._pendingManyArrayUpdates = this._pendingManyArrayUpdates || []);
    pending.push(identifier, key);

    if (this._willUpdateManyArrays === true) {
      return;
    }

    this._willUpdateManyArrays = true;
    let backburner = this.store._backburner;

    backburner.join(() => {
      backburner.schedule('syncRelationships', this, this._flushPendingManyArrayUpdates);
    });
  }

  _flushPendingManyArrayUpdates() {
    if (this._willUpdateManyArrays === false) {
      return;
    }

    let pending = this._pendingManyArrayUpdates;
    this._pendingManyArrayUpdates = [];
    this._willUpdateManyArrays = false;
    let store = this.store;

    for (let i = 0; i < pending.length; i += 2) {
      let identifier = pending[i];
      let key = pending[i + 1];
      let internalModel = store._imCache.get(identifier);
      internalModel && internalModel.notifyHasManyChange(key);
    }
  }

  attributesDefinitionFor(modelName) {
    return this.store._attributesDefinitionFor(modelName);
  }

  relationshipsDefinitionFor(modelName) {
    return this.store._relationshipsDefinitionFor(modelName);
  }

  inverseForRelationship(modelName, key) {
    let modelClass = this.store.modelFor(modelName);
    return this.relationshipsDefinitionFor(modelName)[key]._inverseKey(this.store, modelClass);
  }

  // TODO Igor David cleanup
  inverseIsAsyncForRelationship(modelName, key) {
    let modelClass = this.store.modelFor(modelName);
    return this.relationshipsDefinitionFor(modelName)[key]._inverseIsAsync(this.store, modelClass);
  }

  notifyPropertyChange(type, id, lid, key) {
    let identifier = this.store.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
    let internalModel = this.store._imCache.get(identifier);
    internalModel && internalModel.notifyPropertyChange(key);
  }

  notifyHasManyChange(type, id, lid, key) {
    let identifier = this.store.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
    this._scheduleManyArrayUpdate(identifier, key);
  }

  notifyBelongsToChange(type, id, lid, key) {
    let identifier = this.store.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
    let internalModel = this.store._imCache.get(identifier);
    internalModel && internalModel.notifyBelongsToChange(key);
  }

  recordDataFor(type, id, lid) {
    let identifier = this.store.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
    return this.store.recordDataFor(identifier);
  }

  setRecordId(type, id, lid) {
    this.store.setRecordId(type, id, lid);
  }

  isRecordInUse(type, id, lid) {
    let identifier = this.store.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
    let internalModel = this.store._imCache.get(identifier);

    if (!internalModel) {
      return false;
    }
    return internalModel.isRecordInUse();
  }

  disconnectRecord(type, id, lid) {
    let identifier = this.store.identifierCache.getOrCreateRecordIdentifier({ type, id, lid });
    let internalModel = this.store._imCache.get(identifier);

    if (internalModel) {
      internalModel.destroyFromRecordData();
    }
  }
}
