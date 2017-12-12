import { assert } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';
import { PromiseManyArray } from '../../promise-proxies';
import Relationship from './relationship';
import OrderedSet from '../../ordered-set';
import ManyArray from '../../many-array';

export default class ManyRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.belongsToType = relationshipMeta.type;
    this.canonicalState = [];
    this.currentState = [];
    this.isPolymorphic = relationshipMeta.options.polymorphic;
    this._manyArray = null;
    this.__loadingPromise = null;
  }

  get _loadingPromise() { return this.__loadingPromise; }
  _updateLoadingPromise(promise, content) {
    if (this.__loadingPromise) {
      if (content) {
        this.__loadingPromise.set('content', content)
      }
      this.__loadingPromise.set('promise', promise)
    } else {
      this.__loadingPromise = PromiseManyArray.create({
        promise,
        content
      });
    }

    return this.__loadingPromise;
  }

  removeInverseRelationships() {
    super.removeInverseRelationships();
    if (this._manyArray) {
      this._manyArray.destroy();
      this._manyArray = null;
    }

    if (this._loadingPromise) {
      this._loadingPromise.destroy();
    }
  }

  updateMeta(meta) {
    super.updateMeta(meta);
    if (this._manyArray) {
      this._manyArray.set('meta', meta);
    }
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
    if (this._manyArray) {
      this._manyArray.destroy();
      this._manyArray = null;
    }
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

    if (this._manyArray) {
      this._manyArray.flushCanonical(toSet);
    }
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

  reload() {
    return
    let manyArray = this.manyArray;
    let manyArrayLoadedState = manyArray.get('isLoaded');

    if (this._loadingPromise) {
      if (this._loadingPromise.get('isPending')) {
        return this._loadingPromise;
      }
      if (this._loadingPromise.get('isRejected')) {
        manyArray.set('isLoaded', manyArrayLoadedState);
      }
    }

    let promise;
    if (this.link) {
      promise = this.fetchLink();
    } else {
      promise = this.store._scheduleFetchMany(manyArray.currentState).then(() => manyArray);
    }

    this._updateLoadingPromise(promise);
    return this._loadingPromise;
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

  fetchLink() {
    return this.store.findHasMany(this.internalModel, this.link, this.relationshipMeta).then(records => {
      if (records.hasOwnProperty('meta')) {
        this.updateMeta(records.meta);
      }
      this.store._backburner.join(() => {
        this.updateInternalModelsFromAdapter(records);
        this.manyArray.set('isLoaded', true);
        this.setHasData(true);
      });
      return this.manyArray;
    });
  }

  findRecords() {
    let manyArray = this.manyArray;
    let internalModels = manyArray.currentState;

    //TODO CLEANUP
    return this.store.findMany(internalModels).then(() => {
      if (!manyArray.get('isDestroyed')) {
        //Goes away after the manyArray refactor
        manyArray.set('isLoaded', true);
      }
      return manyArray;
    });
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
    return payload;
  }

  getRecords() {
    //TODO(Igor) sync server here, once our syncing is not stupid
    let manyArray = this.manyArray;
    if (this.isAsync) {
      let promise;
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findRecords();
        } else {
          promise = this.findLink().then(() => this.findRecords());
        }
      } else {
        promise = this.findRecords();
      }
      return this._updateLoadingPromise(promise, manyArray);
    } else {
      assert(`You looked up the '${this.key}' relationship on a '${this.internalModel.type.modelName}' with id ${this.internalModel.id} but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async ('DS.hasMany({ async: true })')`, manyArray.isEvery('isEmpty', false));

      //TODO(Igor) WTF DO I DO HERE?
      // TODO @runspired equal WTFs to Igor
      if (!manyArray.get('isDestroyed')) {
        manyArray.set('isLoaded', true);
      }
      return manyArray;
    }
  }

  updateData(data, initial) {
    debugger
    let internalModels = this.store._pushResourceIdentifiers(this, data);
    if (initial) {
      this.setInitialInternalModels(internalModels);
    } else {
      this.updateInternalModelsFromAdapter(internalModels);
    }
  }

  destroy() {
    super.destroy();
    let manyArray = this._manyArray;
    if (manyArray) {
      manyArray.destroy();
    }

    let proxy = this.__loadingPromise;

    if (proxy) {
      proxy.destroy();
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
