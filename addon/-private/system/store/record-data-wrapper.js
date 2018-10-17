import { recordIdentifierFor } from "../cache/identifier-index";
import { internalModelFor } from "../cache/internal-model-for";

export default class RecordDataWrapper {
  constructor(store) {
    this.store = store;
    this._willUpdateManyArrays = false;
    this._pendingManyArrayUpdates = null;
  }

  _scheduleManyArrayUpdate(lid, key) {
    let pending = (this._pendingManyArrayUpdates = this._pendingManyArrayUpdates || []);
    pending.push(lid, key);

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
      let lid = pending[i];
      let key = pending[i + 1];
      let internalModel = internalModelFor(lid);

      // TODO refactor this to either the default `RecordData` or the `Store`
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

  notifyPropertyChange(modelName, id, clientId, key) {
    // TODO just pass in `lid`
    let lid = recordIdentifierFor({ type: modelName, id, lid: clientId });
    let internalModel = internalModelFor(lid);

    // TODO notify via the store
    internalModel.notifyPropertyChange(key);
  }

  notifyHasManyChange(modelName, id, clientId, key) {
    // TODO just pass in the lid
    let lid = recordIdentifierFor({ type: modelName, id, lid: clientId });
    this._scheduleManyArrayUpdate(lid, key);
  }

  notifyBelongsToChange(modelName, id, clientId, key) {
    // TODO just pass in lid
    let lid = recordIdentifierFor({ type: modelName, id, lid: clientId });
    let internalModel = internalModelFor(lid);

    internalModel.notifyBelongsToChange(key);
  }

  recordDataFor(modelName, id, clientId) {
    return this.store.recordDataFor(modelName, id, clientId);
  }

  setRecordId(modelName, id, clientId) {
    // TODO deprecate in favor of updating indexes
    this.store.setRecordId(modelName, id, clientId);
  }

  isRecordInUse(modelName, id, clientId) {
    if (this.store.isDestroying) {
      return false;
    }

    // TODO just pass in lid
    let lid = recordIdentifierFor({ type: modelName, id, lid: clientId });
    let internalModel = internalModelFor(lid);

    if (!internalModel) {
      return false;
    }
    return internalModel.isRecordInUse();
  }

  disconnectRecord(modelName, id, clientId) {
    if (this.store.isDestroying) {
      return;
    }

    // TODO just pass in lid
    let lid = recordIdentifierFor({ type: modelName, id, lid: clientId });
    let internalModel = internalModelFor(lid);

    if (internalModel) {
      internalModel.destroyFromRecordData();
    }
  }
}
