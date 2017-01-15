import { assert } from "ember-data/-private/debug";
import { PromiseManyArray, promiseManyArray } from "ember-data/-private/system/promise-proxies";
import Relationship from "ember-data/-private/system/relationships/state/relationship";
import OrderedSet from "ember-data/-private/system/ordered-set";
import ManyArray from "ember-data/-private/system/many-array";

import { assertPolymorphicType } from "ember-data/-private/debug";

export default class ManyRelationship extends Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    super(store, internalModel, inverseKey, relationshipMeta);
    this.belongsToType = relationshipMeta.type;
    this.canonicalState = [];
    this.isPolymorphic = relationshipMeta.options.polymorphic;
  }

  getManyArray() {
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
    }
    return this._manyArray;
  }

  destroy() {
    if (this._manyArray) {
      this._manyArray.destroy();
    }
  }

  updateMeta(meta) {
    super.updateMeta(meta);
    if (this._manyArray) {
      this._manyArray.set('meta', meta);
    }
  }

  addCanonicalInverse(inverse, idx) {
    if (this.canonicalMembers.has(inverse)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, inverse);
    } else {
      this.canonicalState.push(inverse);
    }
    super.addCanonicalInverse(inverse, idx);
  }

  addInverse(inverse, idx) {
    if (this.members.has(inverse)) {
      return;
    }
    super.addInverse(inverse, idx);
    // make lazy later
    this.getManyArray().internalAddRecords([inverse], idx);
  }

  removeCanonicalInverseFromOwn(inverse, idx) {
    var i = idx;
    if (!this.canonicalMembers.has(inverse)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(inverse);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalInverseFromOwn(inverse, idx);
  }

  flushCanonical() {
    if (this._manyArray) {
      this._manyArray.flushCanonical();
    }
    super.flushCanonical();
  }

  removeInverseFromOwn(inverse, idx) {
    if (!this.members.has(inverse)) {
      return;
    }
    super.removeInverseFromOwn(inverse, idx);
    let manyArray = this.getManyArray();
    if (idx !== undefined) {
      //TODO(Igor) not used currently, fix
      manyArray.currentState.removeAt(idx);
    } else {
      manyArray.internalRemoveRecords([inverse]);
    }
  }

  notifyInverseRelationshipAdded(inverse, idx) {
    assertPolymorphicType(this.internalModel, this.relationshipMeta, inverse);

    this.internalModel.notifyHasManyAdded(this.key, inverse, idx);
  }

  reload() {
    let manyArray = this.getManyArray();
    let manyArrayLoadedState = manyArray.get('isLoaded');

    if (this._loadingPromise) {
      if (this._loadingPromise.get('isPending')) {
        return this._loadingPromise;
      }
      if (this._loadingPromise.get('isRejected')) {
        manyArray.set('isLoaded', manyArrayLoadedState);
      }
    }

    if (this.link) {
      this._loadingPromise = promiseManyArray(this.fetchLink(), 'Reload with link');
      return this._loadingPromise;
    } else {
      this._loadingPromise = promiseManyArray(this.store._scheduleFetchMany(manyArray.currentState).then(() => manyArray), 'Reload with ids');
      return this._loadingPromise;
    }
  }

  computeChanges(inverses) {
    let members = this.canonicalMembers;
    let inversesToRemove = [];
    let inverseSet = setForArray(inverses);

    members.forEach(function(member) {
      if (inverseSet.has(member)) { return; }

      inversesToRemove.push(member);
    });

    this.removeCanonicalInverses(inversesToRemove);

    for (let i = 0, l = inverses.length; i < l; i++) {
      let inverse = inverses[i];
      this.removeCanonicalInverse(inverse);
      this.addCanonicalInverse(inverse, i);
    }
  }

  fetchLink() {
    return this.store.findHasMany(this.internalModel, this.link, this.relationshipMeta).then((inverses) => {
      if (inverses.hasOwnProperty('meta')) {
        this.updateMeta(inverses.meta);
      }
      this.store._backburner.join(() => {
        this.updateInversesFromAdapter(inverses);
        this.getManyArray().set('isLoaded', true);
      });
      return this.getManyArray();
    });
  }

  findInverses() {
    let manyArray = this.getManyArray();
    let array = manyArray.toArray();
    let internalModels = new Array(array.length);

    for (let i = 0; i < array.length; i++) {
      internalModels[i] = array[i]._internalModel;
    }

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

  getInverses() {
    //TODO(Igor) sync server here, once our syncing is not stupid
    let manyArray = this.getManyArray();
    if (this.isAsync) {
      var promise;
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findInverses();
        } else {
          promise = this.findLink().then(() => this.findInverses());
        }
      } else {
        promise = this.findInverses();
      }
      this._loadingPromise = PromiseManyArray.create({
        content: manyArray,
        promise: promise
      });
      return this._loadingPromise;
    } else {
      assert("You looked up the '" + this.key + "' relationship on a '" + this.internalModel.type.modelName + "' with id " + this.internalModel.id +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", manyArray.isEvery('isEmpty', false));

      //TODO(Igor) WTF DO I DO HERE?
      // TODO @runspired equal WTFs to Igor
      if (!manyArray.get('isDestroyed')) {
        manyArray.set('isLoaded', true);
      }
      return manyArray;
    }
  }

  updateData(data) {
    let internalModels = this.store._pushResourceIdentifiers(this, data);
    this.updateInversesFromAdapter(internalModels);
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
