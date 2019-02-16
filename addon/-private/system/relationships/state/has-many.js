import { assertPolymorphicType } from 'ember-data/-debug';
import Relationship from './relationship';
import OrderedSet from '../../ordered-set';
import { isNone } from '@ember/utils';

export default class ManyRelationship extends Relationship {
  constructor(store, inverseKey, relationshipMeta, recordData, inverseIsAsync) {
    super(store, inverseKey, relationshipMeta, recordData, inverseIsAsync);
    this.canonicalState = [];
    this.currentState = [];
    this._willUpdateManyArray = false;
    this._pendingManyArrayUpdates = null;
  }

  removeInverseRelationships() {
    super.removeInverseRelationships();

    /* TODO Igor make sure this is still working
    if (this._promiseProxy) {
      this._promiseProxy.destroy();
    }
    */
  }

  addCanonicalRecordData(recordData, idx) {
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

  inverseDidDematerialize(inverseRecordData) {
    super.inverseDidDematerialize(inverseRecordData);
    if (this.isAsync) {
      this.notifyManyArrayIsStale();
    }
  }

  addRecordData(recordData, idx) {
    if (this.members.has(recordData)) {
      return;
    }

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

  removeCanonicalRecordDataFromOwn(recordData, idx) {
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
  removeCompletelyFromOwn(recordData) {
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
  removeRecordDataFromOwn(recordData, idx) {
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

  computeChanges(recordDatas = []) {
    let members = this.canonicalMembers;
    let recordDatasToRemove = [];
    let recordDatasSet = setForArray(recordDatas);

    members.forEach(member => {
      if (recordDatasSet.has(member)) {
        return;
      }

      recordDatasToRemove.push(member);
    });

    this.removeCanonicalRecordDatas(recordDatasToRemove);

    for (let i = 0, l = recordDatas.length; i < l; i++) {
      let recordData = recordDatas[i];
      this.removeCanonicalRecordData(recordData);
      this.addCanonicalRecordData(recordData, i);
    }
  }

  setInitialRecordDatas(recordDatas) {
    if (Array.isArray(recordDatas) === false || recordDatas.length === 0) {
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
    storeWrapper.notifyPropertyChange(
      recordData.modelName,
      recordData.id,
      recordData.clientId,
      this.key
    );
  }

  notifyHasManyChange() {
    let recordData = this.recordData;
    let storeWrapper = recordData.storeWrapper;
    storeWrapper.notifyHasManyChange(
      recordData.modelName,
      recordData.id,
      recordData.clientId,
      this.key
    );
  }

  getData() {
    let payload = {};
    if (this.hasAnyRelationshipData) {
      payload.data = this.currentState.map(recordData => recordData.getResourceIdentifier());
    }
    if (this.link) {
      payload.links = {
        related: this.link,
      };
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
    let recordDatas;
    if (isNone(data)) {
      recordDatas = undefined;
    } else {
      recordDatas = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        recordDatas[i] = this.recordData.storeWrapper.recordDataFor(data[i].type, data[i].id);
      }
    }
    if (initial) {
      this.setInitialRecordDatas(recordDatas);
    } else {
      this.updateRecordDatasFromAdapter(recordDatas);
    }
  }

  /**
   * Flag indicating whether all inverse records are available
   *
   * true if inverse records exist and are all loaded (all not empty)
   * true if there are no inverse records
   * false if the inverse records exist and any are not loaded (any empty)
   *
   * @return {boolean}
   */
  get allInverseRecordsAreLoaded() {
    // check currentState for unloaded records
    let hasEmptyRecords = this.currentState.reduce((hasEmptyModel, i) => {
      return hasEmptyModel || i.isEmpty();
    }, false);
    // check un-synced state for unloaded records
    if (!hasEmptyRecords && this.willSync) {
      hasEmptyRecords = this.canonicalState.reduce((hasEmptyModel, i) => {
        return hasEmptyModel || !i.isEmpty();
      }, false);
    }

    return !hasEmptyRecords;
  }
}

function setForArray(array) {
  var set = new OrderedSet();

  if (array) {
    for (var i = 0, l = array.length; i < l; i++) {
      set.add(array[i]);
    }
  }

  return set;
}
