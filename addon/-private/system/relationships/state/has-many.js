import { assert } from "ember-data/-private/debug";
import { PromiseManyArray, promiseManyArray } from "ember-data/-private/system/promise-proxies";
import Relationship from "ember-data/-private/system/relationships/state/relationship";
import OrderedSet from "ember-data/-private/system/ordered-set";
import ManyArray from "ember-data/-private/system/many-array";

import { assertPolymorphicType } from "ember-data/-private/debug";

export default function ManyRelationship(store, record, inverseKey, relationshipMeta) {
  this._super$constructor(store, record, inverseKey, relationshipMeta);
  this.belongsToType = relationshipMeta.type;
  this.canonicalState = [];
  this.isPolymorphic = relationshipMeta.options.polymorphic;
}

ManyRelationship.prototype = Object.create(Relationship.prototype);
ManyRelationship.prototype.getManyArray = function() {
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
};

ManyRelationship.prototype.constructor = ManyRelationship;
ManyRelationship.prototype._super$constructor = Relationship;

ManyRelationship.prototype.destroy = function() {
  if (this._manyArray) {
    this._manyArray.destroy();
  }
};

ManyRelationship.prototype._super$updateMeta = Relationship.prototype.updateMeta;
ManyRelationship.prototype.updateMeta = function(meta) {
  this._super$updateMeta(meta);
  if (this._manyArray) {
    this._manyArray.set('meta', meta);
  }
};

ManyRelationship.prototype._super$addCanonicalRecord = Relationship.prototype.addCanonicalRecord;
ManyRelationship.prototype.addCanonicalRecord = function(record, idx) {
  if (this.canonicalMembers.has(record)) {
    return;
  }
  if (idx !== undefined) {
    this.canonicalState.splice(idx, 0, record);
  } else {
    this.canonicalState.push(record);
  }
  this._super$addCanonicalRecord(record, idx);
};

ManyRelationship.prototype._super$addRecord = Relationship.prototype.addRecord;
ManyRelationship.prototype.addRecord = function(record, idx) {
  if (this.members.has(record)) {
    return;
  }
  this._super$addRecord(record, idx);
  // make lazy later
  this.getManyArray().internalAddRecords([record], idx);
};

ManyRelationship.prototype._super$removeCanonicalRecordFromOwn = Relationship.prototype.removeCanonicalRecordFromOwn;
ManyRelationship.prototype.removeCanonicalRecordFromOwn = function(record, idx) {
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
  this._super$removeCanonicalRecordFromOwn(record, idx);
};

ManyRelationship.prototype._super$flushCanonical = Relationship.prototype.flushCanonical;
ManyRelationship.prototype.flushCanonical = function() {
  if (this._manyArray) {
    this._manyArray.flushCanonical();
  }
  this._super$flushCanonical();
};

ManyRelationship.prototype._super$removeRecordFromOwn = Relationship.prototype.removeRecordFromOwn;
ManyRelationship.prototype.removeRecordFromOwn = function(record, idx) {
  if (!this.members.has(record)) {
    return;
  }
  this._super$removeRecordFromOwn(record, idx);
  let manyArray = this.getManyArray();
  if (idx !== undefined) {
    //TODO(Igor) not used currently, fix
    manyArray.currentState.removeAt(idx);
  } else {
    manyArray.internalRemoveRecords([record]);
  }
};

ManyRelationship.prototype.notifyRecordRelationshipAdded = function(record, idx) {
  assertPolymorphicType(this.record, this.relationshipMeta, record);

  this.record.notifyHasManyAdded(this.key, record, idx);
};

ManyRelationship.prototype.reload = function() {
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
};

ManyRelationship.prototype.computeChanges = function(records) {
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
};

ManyRelationship.prototype.fetchLink = function() {
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
};

ManyRelationship.prototype.findRecords = function() {
  let manyArray = this.getManyArray()
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
};
ManyRelationship.prototype.notifyHasManyChanged = function() {
  this.record.notifyHasManyAdded(this.key);
};

ManyRelationship.prototype.getRecords = function() {
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
    if (!manyArray.get('isDestroyed')) {
      manyArray.set('isLoaded', true);
    }
    return manyArray;
  }
};

ManyRelationship.prototype.updateData = function(data) {
  let internalModels = this.store._pushResourceIdentifiers(this, data);
  this.updateRecordsFromAdapter(internalModels);
};

function setForArray(array) {
  var set = new OrderedSet();

  if (array) {
    for (var i=0, l=array.length; i<l; i++) {
      set.add(array[i]);
    }
  }

  return set;
}
