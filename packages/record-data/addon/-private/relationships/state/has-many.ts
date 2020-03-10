import { isNone } from '@ember/utils';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import { assertPolymorphicType } from '@ember-data/store/-debug';

import Relationship from './relationship';

type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type RelationshipRecordData = import('../../ts-interfaces/relationship-record-data').RelationshipRecordData;
type DefaultCollectionResourceRelationship = import('../../ts-interfaces/relationship-record-data').DefaultCollectionResourceRelationship;

/**
  @module @ember-data/store
*/

export default class ManyRelationship extends Relationship {
  canonicalState: RelationshipRecordData[];
  currentState: RelationshipRecordData[];
  _willUpdateManyArray: boolean;
  _pendingManyArrayUpdates: any;
  key: string;
  constructor(
    store: any,
    inverseKey: string | null,
    relationshipMeta: RelationshipSchema,
    recordData: RelationshipRecordData,
    inverseIsAsync: boolean
  ) {
    super(store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
    this.canonicalState = [];
    this.currentState = [];
    this._willUpdateManyArray = false;
    this._pendingManyArrayUpdates = null;
    this.key = relationshipMeta.key;
  }

  addCanonicalRecordData(recordData: RelationshipRecordData, idx?: number) {
    if (this.canonicalMembers.has(recordData)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, recordData);
    } else {
      this.canonicalState.push(recordData);
    }
    super.addCanonicalRecordData(recordData, idx);
  }

  inverseDidDematerialize(inverseRecordData: RelationshipRecordData) {
    super.inverseDidDematerialize(inverseRecordData);
    if (this.isAsync) {
      this.notifyManyArrayIsStale();
    }
  }

  addRecordData(recordData: RelationshipRecordData, idx?: number) {
    if (this.members.has(recordData)) {
      return;
    }

    // TODO Type this
    assertPolymorphicType(this.recordData, this.relationshipMeta, recordData, this.store);
    super.addRecordData(recordData, idx);
    // make lazy later
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.currentState.splice(idx, 0, recordData);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    // this.manyArray.flushCanonical(this.currentState);
    this.notifyHasManyChange();
  }

  removeCanonicalRecordDataFromOwn(recordData: RelationshipRecordData, idx?: number) {
    let i = idx;
    if (!this.canonicalMembers.has(recordData)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(recordData);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalRecordDataFromOwn(recordData, idx);
    //TODO(Igor) Figure out what to do here
  }

  removeAllCanonicalRecordDatasFromOwn() {
    super.removeAllCanonicalRecordDatasFromOwn();
    this.canonicalMembers.clear();
    this.canonicalState.splice(0, this.canonicalState.length);
    super.removeAllCanonicalRecordDatasFromOwn();
  }

  //TODO(Igor) DO WE NEED THIS?
  removeCompletelyFromOwn(recordData: RelationshipRecordData) {
    super.removeCompletelyFromOwn(recordData);

    // TODO SkEPTICAL
    const canonicalIndex = this.canonicalState.indexOf(recordData);

    if (canonicalIndex !== -1) {
      this.canonicalState.splice(canonicalIndex, 1);
    }

    this.removeRecordDataFromOwn(recordData);
  }

  flushCanonical() {
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newRecordDatas = this.currentState.filter(
      // only add new internalModels which are not yet in the canonical state of this
      // relationship (a new internalModel can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)

      //TODO Igor deal with this
      recordData => recordData.isNew() && toSet.indexOf(recordData) === -1
    );
    toSet = toSet.concat(newRecordDatas);

    /*
    if (this._manyArray) {
      this._manyArray.flushCanonical(toSet);
    }
    */
    this.currentState = toSet;
    super.flushCanonical();
    // Once we clean up all the flushing, we will be left with at least the notifying part
    this.notifyHasManyChange();
  }

  //TODO(Igor) idx not used currently, fix
  removeRecordDataFromOwn(recordData: RelationshipRecordData, idx?: number) {
    super.removeRecordDataFromOwn(recordData, idx);
    let index = idx || this.currentState.indexOf(recordData);

    //TODO IGOR DAVID INVESTIGATE
    if (index === -1) {
      return;
    }
    this.currentState.splice(index, 1);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    this.notifyHasManyChange();
    // this.manyArray.flushCanonical(this.currentState);
  }

  notifyRecordRelationshipAdded() {
    this.notifyHasManyChange();
  }

  computeChanges(recordDatas: RelationshipRecordData[] = []) {
    const members = this.canonicalMembers.toArray();
    for (let i = members.length - 1; i >= 0; i--) {
      this.removeCanonicalRecordData(members[i], i);
    }
    for (let i = 0, l = recordDatas.length; i < l; i++) {
      this.addCanonicalRecordData(recordDatas[i], i);
    }
  }

  setInitialRecordDatas(recordDatas: RelationshipRecordData[] | undefined) {
    if (Array.isArray(recordDatas) === false || !recordDatas || recordDatas.length === 0) {
      return;
    }

    for (let i = 0; i < recordDatas.length; i++) {
      let recordData = recordDatas[i];
      if (this.canonicalMembers.has(recordData)) {
        continue;
      }

      this.canonicalMembers.add(recordData);
      this.members.add(recordData);
      this.setupInverseRelationship(recordData);
    }

    this.canonicalState = this.canonicalMembers.toArray();
  }

  /*
    This is essentially a "sync" version of
      notifyHasManyChange. We should work to unify
      these worlds

      - @runspired
  */
  notifyManyArrayIsStale() {
    let recordData = this.recordData;
    let storeWrapper = recordData.storeWrapper;
    if (CUSTOM_MODEL_CLASS) {
      storeWrapper.notifyHasManyChange(recordData.modelName, recordData.id, recordData.clientId, this.key);
    } else {
      storeWrapper.notifyPropertyChange(recordData.modelName, recordData.id, recordData.clientId, this.key);
    }
  }

  notifyHasManyChange() {
    let recordData = this.recordData;
    let storeWrapper = recordData.storeWrapper;
    storeWrapper.notifyHasManyChange(recordData.modelName, recordData.id, recordData.clientId, this.key);
  }

  getData(): DefaultCollectionResourceRelationship {
    let payload: any = {};
    if (this.hasAnyRelationshipData) {
      payload.data = this.currentState.map(recordData => recordData.getResourceIdentifier());
    }
    if (this.links) {
      payload.links = this.links;
    }
    if (this.meta) {
      payload.meta = this.meta;
    }

    // TODO @runspired: the @igor refactor is too limiting for relationship state
    //   we should reconsider where we fetch from.
    payload._relationship = this;

    return payload;
  }

  updateData(data, initial) {
    let recordDatas: RelationshipRecordData[] | undefined;
    if (isNone(data)) {
      recordDatas = undefined;
    } else {
      recordDatas = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        recordDatas[i] = this.recordData.storeWrapper.recordDataFor(data[i].type, data[i].id) as RelationshipRecordData;
      }
    }
    if (initial) {
      this.setInitialRecordDatas(recordDatas);
    } else {
      this.updateRecordDatasFromAdapter(recordDatas);
    }
  }
}
