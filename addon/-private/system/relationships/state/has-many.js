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
    this.isPolymorphic = relationshipMeta.options.polymorphic;
    // The ManyArray for this relationship
    this._manyArray = null;
    // The previous ManyArray for this relationship.  It will be destroyed when
    // we create a new many array, but in the interim it will be updated if
    // inverse internal models are unloaded.
    this._retainedManyArray = null;
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

  get manyArray() {
    assert(`Error: relationship ${this.parentType}:${this.key} has both many array and retained many array`, this._manyArray === null || this._retainedManyArray === null);

    if (!this._manyArray) {
      this._manyArray = ManyArray.create({
        canonicalState: this.canonicalState,
        store: this.store,
        relationship: this,
        type: this.store.modelFor(this.belongsToType),
        record: this.internalModel,
        meta: this.meta,
        isPolymorphic: this.isPolymorphic
      });

      if (this._retainedManyArray !== null) {
        this._retainedManyArray.destroy();
        this._retainedManyArray = null;
      }
    }

    return this._manyArray;
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

  inverseDidDematerialize(inverseInternalModel) {
    super.inverseDidDematerialize(inverseInternalModel);
    if (this.isAsync) {
      if (this._manyArray) {
        this._retainedManyArray = this._manyArray;
        this._manyArray = null;
      }
      this._removeInternalModelFromManyArray(this._retainedManyArray, inverseInternalModel);
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
    this.manyArray._addInternalModels([internalModel], idx);
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
  }

  removeAllCanonicalInternalModelsFromOwn() {
    super.removeAllCanonicalInternalModelsFromOwn();
    this.canonicalMembers.clear();
    this.canonicalState.splice(0, this.canonicalState.length);
  }

  removeCompletelyFromOwn(internalModel) {
    super.removeCompletelyFromOwn(internalModel);

    const canonicalIndex = this.canonicalState.indexOf(internalModel);

    if (canonicalIndex !== -1) {
      this.canonicalState.splice(canonicalIndex, 1);
    }

    const manyArray = this._manyArray;

    if (manyArray) {
      const idx = manyArray.currentState.indexOf(internalModel);

      if (idx !== -1) {
        manyArray.internalReplace(idx, 1);
      }
    }
  }

  flushCanonical() {
    if (this._manyArray) {
      this._manyArray.flushCanonical();
    }
    super.flushCanonical();
  }

  removeInternalModelFromOwn(internalModel, idx) {
    if (!this.members.has(internalModel)) {
      return;
    }
    super.removeInternalModelFromOwn(internalModel, idx);
    // note that ensuring the many array is created, via `this.manyArray`
    // (instead of `this._manyArray`) is intentional.
    //
    // Because we're removing from local, and not canonical, state, it is
    // important that the many array is initialized now with those changes,
    // otherwise it will be initialized with canonical state and we'll have
    // lost the fact that this internalModel was removed.
    this._removeInternalModelFromManyArray(this.manyArray, internalModel, idx);
    this._removeInternalModelFromManyArray(this._retainedManyArray, internalModel, idx);
  }

  removeAllInternalModelsFromOwn() {
    super.removeAllInternalModelsFromOwn();
    // as with removeInternalModelFromOwn, we make sure the many array is
    // instantiated, or we'll lose local removals, as we're not updating
    // canonical state here.
    this.manyArray.clear();
    if (this._retainedManyArray) {
      this._retainedManyArray.clear();
    }
  }

  _removeInternalModelFromManyArray(manyArray, internalModel, idx) {
    if (manyArray === null) {
      return;
    }

    if (idx !== undefined) {
      //TODO(Igor) not used currently, fix
      manyArray.currentState.removeAt(idx);
    } else {
      manyArray._removeInternalModels([internalModel]);
    }
  }

  notifyRecordRelationshipAdded(internalModel, idx) {
    this.internalModel.notifyHasManyAdded(this.key, internalModel, idx);
  }

  reload() {
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
      this._manyArray = null;
    }

    let proxy = this.__loadingPromise;

    if (proxy) {
      proxy.destroy();
      this.__loadingPromise = null;
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
