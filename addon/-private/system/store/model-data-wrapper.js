import { get } from '@ember/object';

export default class ModelDataWrapper {
  constructor(store) {
    this.store = store;
    this._relationshipsDefCache = Object.create(null);
    this._attributesDefCache = Object.create(null);
  }

  attributesDefinitionFor(modelName) {
    let attributes = this._attributesDefCache[modelName];
    if (attributes) {
      return attributes;
    } else {
      // TODO IGOR DAVID
    }
  }

  relationshipsDefinitionFor(modelName) {
    let relationships = this._relationshipsDefCache[modelName];
    if (!relationships) {
      let modelClass = this.store._modelFor(modelName);
      relationships = get(modelClass, 'relationshipsObject');
      this._relationshipsDefCache[modelName] = relationships;
    }
    return relationships;
  }

  inverseForRelationship(modelName, key) {
    let modelClass = this.store._modelFor(modelName);
    return this.relationshipsDefinitionFor(modelName)[key]._inverseKey(this.store, modelClass);
  }

  // TODO Igor David cleanup
  inverseIsAsyncForRelationship(modelName, key) {
    let modelClass = this.store._modelFor(modelName);
    return this.relationshipsDefinitionFor(modelName)[key]._inverseIsAsync(this.store, modelClass);
  }

  notifyPropertyChange(modelName, id, clientId, key) {
    let internalModel = this.store._internalModelForId(modelName, id, clientId);
    internalModel.notifyPropertyChange(key);
  }

  notifyHasManyChange(modelName, id, clientId, key) {
    let internalModel = this.store._internalModelForId(modelName, id, clientId);
    internalModel.notifyHasManyChange(key);
  }

  notifyBelongsToChange(modelName, id, clientId, key) {
    let internalModel = this.store._internalModelForId(modelName, id, clientId);
    internalModel.notifyBelongsToChange(key);
  }

  modelDataFor(modelName, id, clientId) {
    return this.store.modelDataFor(modelName, id, clientId);
  }

  isRecordInUse(modelName, id, clientId) {
    let internalModel = this.store._getInternalModelForId(modelName, id, clientId);
    if (!internalModel) {
      return false
    }
    return internalModel.isRecordInUse();
  }

  disconnectRecord(modelName, id, clientId) {
    let internalModel = this.store._getInternalModelForId(modelName, id, clientId);
    if (internalModel) {
      internalModel.destroy();
    }
  }

}
