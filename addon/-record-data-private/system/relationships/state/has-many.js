import { assertPolymorphicType } from 'ember-data/-debug';
import Relationship from './relationship';
import OrderedSet from '../../ordered-set';
import { isNone } from '@ember/utils';

export default class ManyRelationship extends Relationship {
  constructor(store, inverseKey, relationshipMeta, modelData, inverseIsAsync) {
    super(store, inverseKey, relationshipMeta, modelData, inverseIsAsync);
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

  addCanonicalModelData(modelData, idx) {
    if (this.canonicalMembers.has(modelData)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, modelData);
    } else {
      this.canonicalState.push(modelData);
    }
    super.addCanonicalModelData(modelData, idx);
  }

  inverseDidDematerialize(inverseModelData) {
    super.inverseDidDematerialize(inverseModelData);
    if (this.isAsync) {
      this.notifyManyArrayIsStale();
    }
  }

  addModelData(modelData, idx) {
    if (this.members.has(modelData)) {
      return;
    }

    assertPolymorphicType(this.modelData, this.relationshipMeta, modelData, this.store);
    super.addModelData(modelData, idx);
    // make lazy later
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.currentState.splice(idx, 0, modelData);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    // this.manyArray.flushCanonical(this.currentState);
    this.notifyHasManyChanged();
  }

  removeCanonicalModelDataFromOwn(modelData, idx) {
    let i = idx;
    if (!this.canonicalMembers.has(modelData)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(modelData);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalModelDataFromOwn(modelData, idx);
    //TODO(Igor) Figure out what to do here
  }

  removeAllCanonicalModelDatasFromOwn() {
    super.removeAllCanonicalModelDatasFromOwn();
    this.canonicalMembers.clear();
    this.canonicalState.splice(0, this.canonicalState.length);
    super.removeAllCanonicalModelDatasFromOwn();
  }

  //TODO(Igor) DO WE NEED THIS?
  removeCompletelyFromOwn(modelData) {
    super.removeCompletelyFromOwn(modelData);

    // TODO SkEPTICAL
    const canonicalIndex = this.canonicalState.indexOf(modelData);

    if (canonicalIndex !== -1) {
      this.canonicalState.splice(canonicalIndex, 1);
    }

    this.removeModelDataFromOwn(modelData);
  }

  flushCanonical() {
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newModelDatas = this.currentState.filter(
      // only add new internalModels which are not yet in the canonical state of this
      // relationship (a new internalModel can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)

      //TODO Igor deal with this
      modelData => modelData.isNew() && toSet.indexOf(modelData) === -1
    );
    toSet = toSet.concat(newModelDatas);

    /*
    if (this._manyArray) {
      this._manyArray.flushCanonical(toSet);
    }
    */
    this.currentState = toSet;
    super.flushCanonical();
    // Once we clean up all the flushing, we will be left with at least the notifying part
    this.notifyHasManyChanged();
  }

  //TODO(Igor) idx not used currently, fix
  removeModelDataFromOwn(modelData, idx) {
    super.removeModelDataFromOwn(modelData, idx);
    let index = idx || this.currentState.indexOf(modelData);

    //TODO IGOR DAVID INVESTIGATE
    if (index === -1) {
      return;
    }
    this.currentState.splice(index, 1);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    this.notifyHasManyChanged();
    // this.manyArray.flushCanonical(this.currentState);
  }

  notifyRecordRelationshipAdded() {
    this.notifyHasManyChanged();
  }

  computeChanges(modelDatas = []) {
    let members = this.canonicalMembers;
    let modelDatasToRemove = [];
    let modelDatasSet = setForArray(modelDatas);

    members.forEach(member => {
      if (modelDatasSet.has(member)) {
        return;
      }

      modelDatasToRemove.push(member);
    });

    this.removeCanonicalModelDatas(modelDatasToRemove);

    for (let i = 0, l = modelDatas.length; i < l; i++) {
      let modelData = modelDatas[i];
      this.removeCanonicalModelData(modelData);
      this.addCanonicalModelData(modelData, i);
    }
  }

  setInitialModelDatas(modelDatas) {
    if (Array.isArray(modelDatas) === false || modelDatas.length === 0) {
      return;
    }

    for (let i = 0; i < modelDatas.length; i++) {
      let modelData = modelDatas[i];
      if (this.canonicalMembers.has(modelData)) {
        continue;
      }

      this.canonicalMembers.add(modelData);
      this.members.add(modelData);
      this.setupInverseRelationship(modelData);
    }

    this.canonicalState = this.canonicalMembers.toArray();
  }

  /*
    This is essentially a "sync" version of
      notifyHasManyChanged. We should work to unify
      these worlds

      - @runspired
  */
  notifyManyArrayIsStale() {
    let modelData = this.modelData;
    let storeWrapper = modelData.storeWrapper;
    storeWrapper.notifyPropertyChange(
      modelData.modelName,
      modelData.id,
      modelData.clientId,
      this.key
    );
  }

  notifyHasManyChanged() {
    let modelData = this.modelData;
    let storeWrapper = modelData.storeWrapper;
    storeWrapper.notifyHasManyChanged(
      modelData.modelName,
      modelData.id,
      modelData.clientId,
      this.key
    );
  }

  getData() {
    let payload = {};
    if (this.hasAnyRelationshipData) {
      payload.data = this.currentState.map(modelData => modelData.getResourceIdentifier());
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
    let modelDatas;
    if (isNone(data)) {
      modelDatas = undefined;
    } else {
      modelDatas = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        modelDatas[i] = this.modelData.storeWrapper.modelDataFor(data[i].type, data[i].id);
      }
    }
    if (initial) {
      this.setInitialModelDatas(modelDatas);
    } else {
      this.updateModelDatasFromAdapter(modelDatas);
    }
  }

  /**
   * Flag indicating whether all inverse records are available
   *
   * true if inverse records exist and are all loaded (all not empty)
   * true if there are no inverse records
   * false if the inverse records exist and any are not loaded (any empty)
   *
   * @returns {boolean}
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
