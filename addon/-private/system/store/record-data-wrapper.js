import { recordIdentifierFor } from '../cache/record-identifier';
import { internalModelFor } from '../cache/internal-model-for';

export default class RecordDataWrapper {
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

    for (let i = 0; i < pending.length; i += 2) {
      let identifier = pending[i];
      let key = pending[i + 1];
      let internalModel = internalModelFor(identifier);
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

  inverseIsAsyncForRelationship(modelName, key) {
    let modelClass = this.store.modelFor(modelName);
    return this.relationshipsDefinitionFor(modelName)[key]._inverseIsAsync(this.store, modelClass);
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  notifyPropertyChange(type, id, lid, key) {
    let identifier = recordIdentifierFor(this.store, { type, id, lid });
    let internalModel = internalModelFor(identifier);

    internalModel.notifyPropertyChange(key);
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  notifyHasManyChange(type, id, lid, key) {
    let identifier = recordIdentifierFor(this.store, { type, id, lid });
    this._scheduleManyArrayUpdate(identifier, key);
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  notifyBelongsToChange(type, id, lid, key) {
    this.notifyPropertyChange(type, id, lid, key);
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  recordDataFor(type, id, lid) {
    return this.store.recordDataFor(type, id, lid);
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  setRecordId(type, id, lid) {
    this.store.setRecordId(type, id, lid);
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  isRecordInUse(type, id, lid) {
    let identifier = recordIdentifierFor(this.store, { type, id, lid });
    let internalModel = internalModelFor(identifier);

    if (!internalModel) {
      return false;
    }
    return internalModel.isRecordInUse();
  }

  // TODO IDENTIFIER RFC - arg should be identifier
  disconnectRecord(type, id, lid) {
    let identifier = recordIdentifierFor(this.store, { type, id, lid });
    let internalModel = internalModelFor(identifier);

    if (internalModel) {
      internalModel.destroyFromRecordData();
    }
  }
}
