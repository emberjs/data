import { assert } from "ember-data/-private/debug";
import { PromiseManyArray, promiseManyArray } from "ember-data/-private/system/promise-proxies";
import Relationship from "ember-data/-private/system/relationships/state/relationship";
import OrderedSet from "ember-data/-private/system/ordered-set";
import ManyArray from "ember-data/-private/system/many-array";

import { assertPolymorphicType } from "ember-data/-private/debug";

export default class ManyRelationship extends Relationship {
  constructor(store, record, inverseKey, relationshipMeta) {
    super(store, record, inverseKey, relationshipMeta);
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
        record: this.record,
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

  addCanonicalRecord(record, idx) {
    if (this.canonicalMembers.has(record)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, record);
    } else {
      this.canonicalState.push(record);
    }
    super.addCanonicalRecord(record, idx);
  }

  addRecord(record, idx) {
    if (this.members.has(record)) {
      return;
    }
    super.addRecord(record, idx);
    // make lazy later
    this.getManyArray().internalAddRecords([record], idx);
  }

  removeCanonicalRecordFromOwn(record, idx) {
    var i = idx;
    if (!this.canonicalMembers.has(record)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(record);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalRecordFromOwn(record, idx);
  }

  flushCanonical() {
    if (this._manyArray) {
      this._manyArray.flushCanonical();
    }
    super.flushCanonical();
  }

  removeRecordFromOwn(record, idx) {
    if (!this.members.has(record)) {
      return;
    }
    super.removeRecordFromOwn(record, idx);
    let manyArray = this.getManyArray();
    if (idx !== undefined) {
      //TODO(Igor) not used currently, fix
      manyArray.currentState.removeAt(idx);
    } else {
      manyArray.internalRemoveRecords([record]);
    }
  }

  notifyRecordRelationshipAdded(record, idx) {
    assertPolymorphicType(this.record, this.relationshipMeta, record);

    this.record.notifyHasManyAdded(this.key, record, idx);
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

  computeChanges(records) {
    var members = this.canonicalMembers;
    var recordsToRemove = [];
    var length;
    var record;
    var i;

    records = setForArray(records);

    members.forEach(function(member) {
      if (records.has(member)) { return; }

      recordsToRemove.push(member);
    });

    this.removeCanonicalRecords(recordsToRemove);

    // Using records.toArray() since currently using
    // removeRecord can modify length, messing stuff up
    // forEach since it directly looks at "length" each
    // iteration
    records = records.toArray();
    length = records.length;
    for (i = 0; i < length; i++) {
      record = records[i];
      this.removeCanonicalRecord(record);
      this.addCanonicalRecord(record, i);
    }
  }

  fetchLink() {
    return this.store.findHasMany(this.record, this.link, this.relationshipMeta).then((records) => {
      if (records.hasOwnProperty('meta')) {
        this.updateMeta(records.meta);
      }
      this.store._backburner.join(() => {
        this.updateRecordsFromAdapter(records);
        this.getManyArray().set('isLoaded', true);
      });
      return this.getManyArray();
    });
  }

  findRecords() {
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
    this.record.notifyHasManyAdded(this.key);
  }

  getRecords() {
    //TODO(Igor) sync server here, once our syncing is not stupid
    let manyArray = this.getManyArray();
    if (this.isAsync) {
      var promise;
      if (this.link) {
        if (this.hasLoaded) {
          promise = this.findRecords();
        } else {
          promise = this.findLink().then(() => this.findRecords());
        }
      } else {
        promise = this.findRecords();
      }
      this._loadingPromise = PromiseManyArray.create({
        content: manyArray,
        promise: promise
      });
      return this._loadingPromise;
    } else {
      assert("You looked up the '" + this.key + "' relationship on a '" + this.record.type.modelName + "' with id " + this.record.id +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", manyArray.isEvery('isEmpty', false));

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
    this.updateRecordsFromAdapter(internalModels);
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
