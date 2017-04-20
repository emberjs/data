import { assert, assertPolymorphicType } from 'ember-data/-debug';
import { PromiseManyArray } from '../../promise-proxies';
import Relationship from './relationship';
import ImplicitRelationship from './implicit';
import ManyArray from '../../many-array';
import diffArray from '../../diff-array';
import UniqueArray from '../../unique-array';

export default class ManyRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.kind = 'hasMany';
    this.relatedModelName = relationshipMeta.type;
    this._manyArray = null;
    this.__loadingPromise = null;

    this._canonicalState = null;
    this._currentState = null;
  }

  get currentState() {
    return this._currentState || (this._currentState = []);
  }

  set currentState(v) {
    this._currentState = v;
  }

  get canonicalState() {
    return this._canonicalState || (this._canonicalState = []);
  }

  set canonicalState(v) {
    this._canonicalState = v;
  }

  get _loadingPromise() { return this.__loadingPromise; }

  _updateLoadingPromise(promise, content) {
    if (this.__loadingPromise) {
      if (content) {
        this.__loadingPromise.set('content', content)
      }
      this.__loadingPromise.set('promise', promise)
    } else {
      this.__loadingPromise = new PromiseManyArray({
        promise,
        content
      });
    }

    return this.__loadingPromise;
  }

  get manyArray() {
    if (!this._manyArray) {
      this._manyArray = ManyArray.create({
        canonicalState: this.canonicalState,
        currentState: this.currentState,
        store: this.store,
        relationship: this,
        type: this.store.modelFor(this.relatedModelName),
        record: this.internalModel,
        meta: this.meta,
        isPolymorphic: this.isPolymorphic
      });
    }
    return this._manyArray;
  }

  removeInverseRelationships() {
    if (!this.inverseKey) { return; }

    const toIterate = this.canonicalState.concat(this.currentState);
    const uniqueArray = new UniqueArray();

    uniqueArray.push(...toIterate);

    const items = uniqueArray.items;

    for (let i = 0; i < items.length; i++) {
      let inverseInternalModel = items[i];
      let relationship = inverseInternalModel._relationships.get(this.inverseKey);

      // TODO: there is always a relationship in this case; this guard exists
      // because there are tests that fail in teardown after putting things in
      // invalid state
      if (relationship) {
        relationship.inverseDidDematerialize();
      }
    }

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

  setupInverseRelationship(internalModel, isInitial = false) {
    if (this.inverseKey) {
      let relationships = internalModel._relationships;
      let relationshipExisted = !isInitial || relationships.has(this.inverseKey);
      let relationship = relationships.get(this.inverseKey);
      if (relationshipExisted || this.isPolymorphic) {
        // if we have only just initialized the inverse relationship, then it
        // already has this.internalModel in its canonicalMembers, so skip the
        // unnecessary work.  The exception to this is polymorphic
        // relationships whose members are determined by their inverse, as those
        // relationships cannot efficiently find their inverse payloads.
        relationship.addCanonicalInternalModel(this.internalModel);
      }
    } else {
      let relationships = internalModel._implicitRelationships;
      let relationship = relationships[this.inverseKeyForImplicit];
      if (!relationship) {
        relationship = relationships[this.inverseKeyForImplicit] =
          new ImplicitRelationship(this.store, internalModel, this.key,  { options: {} });
      }
      relationship.addCanonicalInternalModel(this.internalModel);
    }
  }

  addCanonicalInternalModel(internalModel, idx) {
    if (this.canonicalState.indexOf(internalModel) !== -1) {
      return;
    }

    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, internalModel);
    } else {
      this.canonicalState.push(internalModel);
    }

    this.setupInverseRelationship(internalModel);

    this.flushCanonicalLater();
    this.setHasData(true);
  }

  inverseDidDematerialize() {
    if (this._manyArray) {
      this._manyArray.destroy();
      this._manyArray = null;
    }
    this.notifyHasManyChanged();
  }

  addInternalModels(internalModels, idx) {
    for (let i = 0; i < internalModels.length; i++) {
      this.addInternalModel(internalModels[i], idx);
      if (idx !== undefined) {
        idx++;
      }
    }
  }

  addInternalModel(internalModel, idx) {
    if (this.currentState.indexOf(internalModel) !== -1) {
      return;
    }

    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.internalReplace(idx, 0, [internalModel]);
    this.notifyRecordRelationshipAdded(internalModel, idx);

    if (this.inverseKey) {
      internalModel._relationships.get(this.inverseKey).addInternalModel(this.internalModel);
    } else {
      if (!internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
        internalModel._implicitRelationships[this.inverseKeyForImplicit] = new ImplicitRelationship(this.store, internalModel, this.key,  { options: {} });
      }
      internalModel._implicitRelationships[this.inverseKeyForImplicit].addInternalModel(this.internalModel);
    }

    this.internalModel.updateRecordArrays();
    this.setHasData(true);
  }

  removeInternalModels(internalModels) {
    for (let i = 0; i < internalModels.length; i++) {
      this.removeInternalModel(internalModels[i]);
    }
  }

  removeInternalModel(internalModel) {
    let index = this.currentState.indexOf(internalModel);
    if (index === -1) {
      return;
    }

    this.removeInternalModelFromOwn(internalModel, index);
    if (this.inverseKey) {
      this.removeInternalModelFromInverse(internalModel);
    } else if (internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
      internalModel._implicitRelationships[this.inverseKeyForImplicit].removeInternalModel(this.internalModel);
    }
  }

  removeCanonicalInternalModels(internalModels) {
    for (let i = 0; i < internalModels.length; i++) {
      this.removeCanonicalInternalModel(internalModels[i]);
    }
  }

  removeCanonicalInternalModel(internalModel) {
    let index = this.canonicalState.indexOf(internalModel);
    if (index === -1) {
      return;
    }

    this.removeCanonicalInternalModelFromOwn(internalModel, index);
    if (this.inverseKey) {
      this.removeCanonicalInternalModelFromInverse(internalModel);
    } else if (internalModel._implicitRelationships[this.inverseKeyForImplicit]) {
      internalModel._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalInternalModel(this.internalModel);
    }

    this.flushCanonicalLater();
  }

  // TODO @runspired we should look into removing ever calling this without an index
  removeCanonicalInternalModelFromOwn(internalModel, idx) {
    let index = idx === undefined ? this.canonicalState.indexOf(internalModel) : idx;
    if (index === -1) {
      return;
    }

    this.canonicalState.splice(index, 1);
    this.flushCanonicalLater();
  }

  flushCanonical() {
    this.willSync = false;
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newInternalModels = this.currentState.filter(
      // only add new records which are not yet in the canonical state of this
      // relationship (a new record can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)
      (internalModel) => internalModel.isNew() && toSet.indexOf(internalModel) === -1
    );
    toSet = toSet.concat(newInternalModels);

    // diff to find changes
    let diff = diffArray(this.currentState, toSet);

    if (diff.firstChangeIndex !== null) { // it's null if no change found
      if (this._manyArray) {
        let manyArray = this._manyArray;
        manyArray.arrayContentWillChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
        manyArray.set('length', toSet.length);
        this.currentState = manyArray.currentState = toSet;
        manyArray.arrayContentDidChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
      } else {
        this.currentState = toSet;
      }

      if (diff.addedCount > 0) {
        //notify only on additions
        //TODO only notify if unloaded
        this.notifyHasManyChanged();
      }
    }
  }

  // TODO @runspired we should look into removing ever calling this without an index
  removeInternalModelFromOwn(internalModel, idx) {
    let index = idx === undefined ? this.currentState.indexOf(internalModel) : idx;

    if (index === -1) {
      return;
    }

    this.notifyRecordRelationshipRemoved(internalModel);
    this.internalModel.updateRecordArrays();
    this.internalReplace(index, 1);
  }

  internalReplace(idx, amt, objects = []) {
    if (this._manyArray) {
      let manyArray = this._manyArray;
      manyArray.arrayContentWillChange(idx, amt, objects.length);
      this.currentState.splice(idx, amt, ...objects);
      manyArray.set('length', this.currentState.length);
      manyArray.arrayContentDidChange(idx, amt, objects.length);
    } else {
      this.currentState.splice(idx, amt, ...objects);
    }
  }

  notifyRecordRelationshipAdded(internalModel, idx) {
    assertPolymorphicType(this.internalModel, this.relationshipMeta, internalModel);

    this.internalModel.notifyHasManyAdded(this.key, internalModel, idx);
  }

  reload() {
    // TODO should we greedily grab manyArray here?
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
      promise = this.store._scheduleFetchMany(this.currentState).then(() => manyArray);
    }

    this._updateLoadingPromise(promise);
    return this._loadingPromise;
  }

  updateInternalModelsFromAdapter(internalModels = []) {
    let state = this.canonicalState;
    let internalModelsToRemove = [];

    if (!internalModels.length) {
      if (state) {
        internalModelsToRemove.push(...state);
      }
    } else {
      for (let i = 0; i < state.length; i++) {
        let internalModel = state[i];

        if (internalModels.indexOf(internalModel) === -1) {
          internalModelsToRemove.push(internalModel);
        }
      }
    }

    if (internalModelsToRemove.length) {
      this.removeCanonicalInternalModels(internalModelsToRemove);
    }

    for (let i = 0, l = internalModels.length; i < l; i++) {
      let internalModel = internalModels[i];
      if (state[i] !== internalModel) {
        this.removeCanonicalInternalModel(internalModel);
        this.addCanonicalInternalModel(internalModel, i);
      }
    }

    this.flushCanonicalLater();
  }

  setInitialInternalModels(internalModels = []) {
    this.canonicalState.push(...internalModels);
    this.currentState.push(...internalModels);

    for (let i = 0; i < internalModels.length; i++) {
      this.setupInverseRelationship(internalModels[i], true);
    }
  }

  fetchLink() {
    return this.store.findHasMany(this.internalModel, this.link, this.relationshipMeta).then(records => {
      if (records.hasOwnProperty('meta')) {
        this.updateMeta(records.meta);
      }
      this.store._backburner.join(() => {
        this.updateInternalModelsFromAdapter(records);
        this.manyArray.set('isLoaded', true);
      });
      return this.manyArray;
    });
  }

  findRecords() {
    let manyArray = this.manyArray;
    let internalModels = this.currentState;

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

  clear() {
    let arr = this.currentState;
    while (arr.length > 0) {
      this.removeInternalModel(arr[0]);
    }

    arr = this.canonicalState;
    while (arr.length > 0) {
      this.removeCanonicalInternalModel(arr[0]);
    }
  }
}
