import { assertPolymorphicType } from 'ember-data/-debug';
import Relationship from './relationship';
import OrderedSet from '../../ordered-set';

export default class ManyRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.belongsToType = relationshipMeta.type;
    this.canonicalState = [];
    this.currentState = [];
    this.isPolymorphic = relationshipMeta.options.polymorphic;
  }

  removeInverseRelationships() {
    super.removeInverseRelationships();

    /* TODO Igor make sure this is still working
    if (this._loadingPromise) {
      this._loadingPromise.destroy();
    }
    */
  }

  addCanonicalInternalModel(internalModel, idx) {
    if (this.canonicalMembers.has(internalModel)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, internalModel);
    } else {
      this.canonicalState.push(internalModel);
    }
    super.addCanonicalInternalModel(internalModel, idx);
  }

  inverseDidDematerialize() {
    this.notifyHasManyChanged();
  }

  addInternalModel(internalModel, idx) {
    if (this.members.has(internalModel)) {
      return;
    }

    assertPolymorphicType(this.internalModel, this.relationshipMeta, internalModel);
    super.addInternalModel(internalModel, idx);
    // make lazy later
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.currentState.splice(idx, 0, internalModel);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    // this.manyArray.flushCanonical(this.currentState);
    this.notifyHasManyChanged();

  }

  removeCanonicalInternalModelFromOwn(internalModel, idx) {
    let i = idx;
    if (!this.canonicalMembers.has(internalModel)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(internalModel);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalInternalModelFromOwn(internalModel, idx);
    //TODO(Igor) Figure out what to do here
  }

  //TODO(Igor) DO WE NEED THIS?
  removeCompletelyFromOwn(internalModel) {
    super.removeCompletelyFromOwn(internalModel);

    // SCEPTICAL
    const canonicalIndex = this.canonicalState.indexOf(internalModel);

    if (canonicalIndex !== -1) {
      this.canonicalState.splice(canonicalIndex, 1);
    }

    this.removeInternalModelFromOwn(internalModel);
  }

  flushCanonical() {
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newInternalModels = this.currentState.filter(
      // only add new internalModels which are not yet in the canonical state of this
      // relationship (a new internalModel can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)
      (internalModel) => internalModel.isNew() && toSet.indexOf(internalModel) === -1
    );
    toSet = toSet.concat(newInternalModels);

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
  removeInternalModelFromOwn(internalModel, idx) {
    /*
    if (!this.members.has(internalModel)) {
      console.log('oh nooo');
      return;
    }
    */
    super.removeInternalModelFromOwn(internalModel, idx);
    let index = idx || this.currentState.indexOf(internalModel);

    this.currentState.splice(index, 1);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    this.notifyHasManyChanged();
   // this.manyArray.flushCanonical(this.currentState);
  }

  notifyRecordRelationshipAdded(internalModel, idx) {
    this.internalModel.notifyHasManyAdded(this.key, internalModel, idx);
  }

  computeChanges(internalModels = []) {
    let members = this.canonicalMembers;
    let internalModelsToRemove = [];
    let internalModelSet = setForArray(internalModels);

    members.forEach(member => {
      if (internalModelSet.has(member)) { return; }

      internalModelsToRemove.push(member);
    });

    this.removeCanonicalInternalModels(internalModelsToRemove);

    for (let i = 0, l = internalModels.length; i < l; i++) {
      let internalModel = internalModels[i];
      this.removeCanonicalInternalModel(internalModel);
      this.addCanonicalInternalModel(internalModel, i);
    }
  }

  setInitialInternalModels(internalModels) {
    if (Array.isArray(internalModels) === false || internalModels.length === 0) {
      return;
    }

    for (let i = 0; i< internalModels.length; i++) {
      let internalModel = internalModels[i];
      if (this.canonicalMembers.has(internalModel)) {
        continue;
      }

      this.canonicalMembers.add(internalModel);
      this.members.add(internalModel);
      this.setupInverseRelationship(internalModel);
    }

    this.canonicalState = this.canonicalMembers.toArray();
  }

  notifyHasManyChanged() {
    this.internalModel.notifyHasManyAdded(this.key);
  }

  getData() {
    let payload = {};
    if (this.currentState) {
      payload.data = this.currentState.map((im) => im._modelData.getResourceIdentifier());
    }
    if (this.link) {
      payload.links = {
        related: this.link
      }
    }
    if (this.meta) {
      // TODO Igor consider whether we should namespace this
      payload.meta = this.meta;
    }
    payload.hasLoaded = this.hasLoaded;
    return payload;
  }

  updateData(data, initial) {
    let internalModels = this.store._pushResourceIdentifiers(this, data);
    if (initial) {
      this.setInitialInternalModels(internalModels);
    } else {
      this.updateInternalModelsFromAdapter(internalModels);
    }
  }
}

function setForArray(array) {
  var set = new OrderedSet();

  if (array) {
    for (var i=0, l=array.length; i<l; i++) {
      set.add(array[i]);
    }
  }

  return set;
}
