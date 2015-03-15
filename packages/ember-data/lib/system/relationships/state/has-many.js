import { PromiseManyArray } from "ember-data/system/promise-proxies";
import Relationship from "ember-data/system/relationships/state/relationship";
import OrderedSet from "ember-data/system/ordered-set";
import ManyArray from "ember-data/system/many-array";

var ManyRelationship = function(store, record, inverseKey, relationshipMeta) {
  this._super$constructor(store, record, inverseKey, relationshipMeta);
  this.belongsToType = relationshipMeta.type;
  this.canonicalState = [];
  this.manyArray = ManyArray.create({
    canonicalState: this.canonicalState,
    store: this.store,
    relationship: this,
    type: this.belongsToType,
    record: record
  });
  this.isPolymorphic = relationshipMeta.options.polymorphic;
  this.manyArray.isPolymorphic = this.isPolymorphic;
};

ManyRelationship.prototype = Ember.create(Relationship.prototype);
ManyRelationship.prototype.constructor = ManyRelationship;
ManyRelationship.prototype._super$constructor = Relationship;

ManyRelationship.prototype.destroy = function() {
  this.manyArray.destroy();
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
  this.manyArray.internalAddRecords([record], idx);
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
  this.manyArray.flushCanonical();
  this._super$flushCanonical();
};

ManyRelationship.prototype._super$removeRecordFromOwn = Relationship.prototype.removeRecordFromOwn;
ManyRelationship.prototype.removeRecordFromOwn = function(record, idx) {
  if (!this.members.has(record)) {
    return;
  }
  this._super$removeRecordFromOwn(record, idx);
  if (idx !== undefined) {
    //TODO(Igor) not used currently, fix
    this.manyArray.currentState.removeAt(idx);
  } else {
    this.manyArray.internalRemoveRecords([record]);
  }
};

ManyRelationship.prototype.notifyRecordRelationshipAdded = function(record, idx) {
  var type = this.relationshipMeta.type;
  Ember.assert("You cannot add '" + record.constructor.typeKey + "' records to the " + this.record.constructor.typeKey + "." + this.key + " relationship (only '" + this.belongsToType.typeKey + "' allowed)", (function () {
    if (type.__isMixin) {
      return type.__mixin.detect(record);
    }
    if (Ember.MODEL_FACTORY_INJECTIONS) {
      type = type.superclass;
    }
    return record instanceof type;
  })());

  this.record.notifyHasManyAdded(this.key, record, idx);
};

ManyRelationship.prototype.notifyRecordRelationshipRemoved = function(record) {
  this.record.notifyHasManyRemoved(this.key, record);
};

ManyRelationship.prototype.reload = function() {
  var self = this;
  if (this.link) {
    return this.fetchLink();
  } else {
    return this.store.scheduleFetchMany(this.manyArray.toArray()).then(function() {
      //Goes away after the manyArray refactor
      self.manyArray.set('isLoaded', true);
      return self.manyArray;
    });
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
  var self = this;
  return this.store.findHasMany(this.record, this.link, this.relationshipMeta).then(function(records) {
    self.store._backburner.join(function() {
      self.updateRecordsFromAdapter(records);
    });
    return self.manyArray;
  });
};

ManyRelationship.prototype.findRecords = function() {
  var manyArray = this.manyArray;
  return this.store.findMany(manyArray.toArray()).then(function() {
    //Goes away after the manyArray refactor
    manyArray.set('isLoaded', true);
    return manyArray;
  });
};
ManyRelationship.prototype.notifyHasManyChanged = function() {
  this.record.notifyPropertyChange(this.key);
};

ManyRelationship.prototype.getRecords = function() {
  //TODO(Igor) sync server here, once our syncing is not stupid
  if (this.isAsync) {
    var self = this;
    var promise;
    if (this.link) {
      promise = this.findLink().then(function() {
        return self.findRecords();
      });
    } else {
      promise = this.findRecords();
    }
    return PromiseManyArray.create({
      content: this.manyArray,
      promise: promise
    });
  } else {
    Ember.assert("You looked up the '" + this.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", this.manyArray.isEvery('isEmpty', false));

    //TODO(Igor) WTF DO I DO HERE?
    if (!this.manyArray.get('isDestroyed')) {
      this.manyArray.set('isLoaded', true);
    }
    return this.manyArray;
  }
};

ManyRelationship.prototype.rollback = function() {
  var canonicalMembers = this.canonicalMembers;
  var canonicalState = this.canonicalState;
  var currentState = this.manyArray.currentState;
  var l = canonicalMembers.size;
  var i;

  for (i = 0; i < l; i++) {
    var canonicalRecord = canonicalState[i];
    var currentRecord = currentState[i];

    if (canonicalRecord === currentRecord) { continue; }

    if (!canonicalMembers.has(currentRecord)) {
      this.removeRecord(currentRecord);
    }

    this.removeRecord(canonicalRecord);
    this.addRecord(canonicalRecord, i);
  }
  this.removeRecords(currentState.slice(canonicalState.length));
  this.record.notifyPropertyChange(this.key);
  this.record.send('propertyWasReset', this.key);
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

export default ManyRelationship;
