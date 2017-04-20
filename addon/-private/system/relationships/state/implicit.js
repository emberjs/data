/* global heimdall */
import OrderedSet from '../../ordered-set';
import Relationship from './relationship';

const {
  addCanonicalInternalModel,
  addCanonicalInternalModels,
  addInternalModel,
  addInternalModels,
  clear,
  flushCanonical,
  newRelationship,
  removeCanonicalInternalModel,
  removeCanonicalInternalModelFromOwn,
  removeCanonicalInternalModels,
  removeInternalModel,
  removeInternalModelFromOwn,
  removeInternalModels
} = heimdall.registerMonitor('system.relationships.state.relationship',
  'addCanonicalInternalModel',
  'addCanonicalInternalModels',
  'addInternalModel',
  'addInternalModels',
  'clear',
  'flushCanonical',
  'newRelationship',
  'removeCanonicalInternalModel',
  'removeCanonicalInternalModelFromOwn',
  'removeCanonicalInternalModels',
  'removeInternalModel',
  'removeInternalModelFromOwn',
  'removeInternalModels'
);

export default class ImplicitRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.kind = 'implicit';
    heimdall.increment(newRelationship);

    this._currentState = null;
    this._canonicalState = null;
  }

  get currentState() {
    return this._currentState || (this._currentState = new OrderedSet());
  }

  set currentState(v) {
    this._currentState = v;
  }

  get canonicalState() {
    return this._canonicalState || (this._canonicalState = new OrderedSet());
  }

  set canonicalState(v) {
    this._canonicalState = v;
  }

  removeInverseRelationships() {
    if (!this.inverseKey) { return; }

    let uniqueSet = new OrderedSet();
    uniqueSet.pushMany(this.currentState.list);
    uniqueSet.pushMany(this.canonicalState.list);

    let items = uniqueSet.list;

    for (let i = 0; i < items.length; i++) {
      let relationship = items[i]._relationships.get(this.inverseKey);
      // TODO: there is always a relationship in this case; this guard exists
      // because there are tests that fail in teardown after putting things in
      // invalid state
      if (relationship) {
        relationship.inverseDidDematerialize();
      }
    }
  }

  inverseDidDematerialize() {}

  clear() {
    heimdall.increment(clear);
    let currentState = this.currentState.list;
    while (currentState.length > 0) {
      let internalModel = currentState[0];
      this.removeInternalModel(internalModel);
    }

    let canonicalState = this.canonicalState.list;
    while (canonicalState.length > 0) {
      let internalModel = canonicalState[0];
      this.removeCanonicalInternalModel(internalModel);
    }
  }

  removeInternalModels(internalModels) {
    heimdall.increment(removeInternalModels);
    for (let i = 0; i < internalModels.length; i++) {
      this.removeInternalModel(internalModels[i]);
    }
  }

  addInternalModels(internalModels, idx) {
    heimdall.increment(addInternalModels);
    for (let i=0; i < internalModels.length; i++) {
      this.addInternalModel(internalModels[i], idx);

      if (idx !== undefined) {
        idx++;
      }
    }
  }

  addCanonicalInternalModels(records, idx) {
    heimdall.increment(addCanonicalInternalModels);
    for (let i=0; i<records.length; i++) {
      this.addCanonicalInternalModel(records[i], i+idx);
      if (idx !== undefined) {
        idx++;
      }
    }
  }

  addCanonicalInternalModel(record) {
    heimdall.increment(addCanonicalInternalModel);
    if (!this.canonicalState.has(record)) {
      this.canonicalState.add(record);
    }
    this.flushCanonicalLater();
    this.setHasData(true);
  }

  removeCanonicalInternalModels(records, idx) {
    heimdall.increment(removeCanonicalInternalModels);
    for (let i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalInternalModel(records[i], i+idx);
      } else {
        this.removeCanonicalInternalModel(records[i]);
      }
    }
  }

  removeCanonicalInternalModel(record, idx) {
    heimdall.increment(removeCanonicalInternalModel);
    if (this.canonicalState.has(record)) {
      this.removeCanonicalInternalModelFromOwn(record);
      if (this.inverseKey) {
        this.removeCanonicalInternalModelFromInverse(record);
      }
    }
    this.flushCanonicalLater();
  }

  addInternalModel(record, idx) {
    heimdall.increment(addInternalModel);
    if (!this.currentState.has(record)) {
      this.currentState.addWithIndex(record, idx);
      this.notifyRecordRelationshipAdded(record, idx);
      this.internalModel.updateRecordArrays();
    }
    this.setHasData(true);
  }

  removeInternalModel(record) {
    heimdall.increment(removeInternalModel);
    if (this.currentState.has(record)) {
      this.removeInternalModelFromOwn(record);
      if (this.inverseKey) {
        this.removeInternalModelFromInverse(record);
      }
    }
  }

  removeInternalModelFromOwn(record) {
    heimdall.increment(removeInternalModelFromOwn);
    this.currentState.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.internalModel.updateRecordArrays();
  }

  removeCanonicalInternalModelFromOwn(record) {
    heimdall.increment(removeCanonicalInternalModelFromOwn);
    this.canonicalState.delete(record);
    this.flushCanonicalLater();
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.currentState.list;
    this.willSync = false;
    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newInternalModels = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].isNew()) {
        newInternalModels.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this._currentState = this.canonicalState.copy();
    for (let i = 0; i < newInternalModels.length; i++) {
      this.currentState.add(newInternalModels[i]);
    }
  }
}
