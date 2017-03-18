/* global heimdall */
import OrderedSet from '../../ordered-set';
import Relationship from './relationship';
import UniqueArray from '../../unique-array';

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

    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
  }

  removeInverseRelationships() {
    if (!this.inverseKey) { return; }

    let uniqueArray = new UniqueArray('_internalId');
    uniqueArray.push(...this.members.list);
    uniqueArray.push(...this.canonicalMembers.list);

    let items = uniqueArray.items;

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
    let members = this.members.list;
    while (members.length > 0) {
      let member = members[0];
      this.removeInternalModel(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalInternalModel(member);
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
    if (!this.canonicalMembers.has(record)) {
      this.canonicalMembers.add(record);
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
    if (this.canonicalMembers.has(record)) {
      this.removeCanonicalInternalModelFromOwn(record);
      if (this.inverseKey) {
        this.removeCanonicalInternalModelFromInverse(record);
      }
    }
    this.flushCanonicalLater();
  }

  addInternalModel(record, idx) {
    heimdall.increment(addInternalModel);
    if (!this.members.has(record)) {
      this.members.addWithIndex(record, idx);
      this.notifyRecordRelationshipAdded(record, idx);
      this.internalModel.updateRecordArrays();
    }
    this.setHasData(true);
  }

  removeInternalModel(record) {
    heimdall.increment(removeInternalModel);
    if (this.members.has(record)) {
      this.removeInternalModelFromOwn(record);
      if (this.inverseKey) {
        this.removeInternalModelFromInverse(record);
      }
    }
  }

  removeInternalModelFromOwn(record) {
    heimdall.increment(removeInternalModelFromOwn);
    this.members.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.internalModel.updateRecordArrays();
  }

  removeCanonicalInternalModelFromOwn(record) {
    heimdall.increment(removeCanonicalInternalModelFromOwn);
    this.canonicalMembers.delete(record);
    this.flushCanonicalLater();
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.members.list;
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
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newInternalModels.length; i++) {
      this.members.add(newInternalModels[i]);
    }
  }
}
