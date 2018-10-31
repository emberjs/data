export default class RecordDataWrapper {
  constructor(store) {
    this.store = store;
    this._willUpdateManyArrays = false;
    this._pendingManyArrayUpdates = null;
  }

  _scheduleManyArrayUpdate(modelName, id, lid, key) {
    let pending = (this._pendingManyArrayUpdates = this._pendingManyArrayUpdates || []);
    pending.push(modelName, id, lid, key);

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

    for (let i = 0; i < pending.length; i += 4) {
      let modelName = pending[i];
      let id = pending[i + 1];
      let lid = pending[i + 2];
      let key = pending[i + 3];
      let internalModel = store._getInternalModelForId(modelName, id, lid);
      internalModel.notifyHasManyChange(key);
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

  notifyPropertyChange(modelName, id, lid, key) {
    let internalModel = this.store._getInternalModelForId(modelName, id, lid);
    internalModel.notifyPropertyChange(key);
  }

  notifyHasManyChange(modelName, id, lid, key) {
    this._scheduleManyArrayUpdate(modelName, id, lid, key);
  }

  notifyBelongsToChange(modelName, id, lid, key) {
    let internalModel = this.store._getInternalModelForId(modelName, id, lid);
    internalModel.notifyBelongsToChange(key);
  }

  recordDataFor(modelName, id, lid) {
    return this.store.recordDataFor(modelName, id, lid);
  }

  setRecordId(modelName, id, lid) {
    this.store.setRecordId(modelName, id, lid);
  }

  isRecordInUse(modelName, id, lid) {
    let internalModel = this.store._getInternalModelForId(modelName, id, lid);
    if (!internalModel) {
      return false;
    }
    return internalModel.isRecordInUse();
  }

  disconnectRecord(modelName, id, lid) {
    let internalModel = this.store._getInternalModelForId(modelName, id, lid);
    if (internalModel) {
      internalModel.destroyFromRecordData();
    }
  }
}
