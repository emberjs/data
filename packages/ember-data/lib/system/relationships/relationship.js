import {
  PromiseManyArray,
  PromiseObject
} from "ember-data/system/promise_proxies";
import {
  OrderedSet
} from "ember-data/system/map";

var Relationship = function(store, record, inverseKey, relationshipMeta) {
  this.members = new OrderedSet();
  this.store = store;
  this.key = relationshipMeta.key;
  this.inverseKey = inverseKey;
  this.record = record;
  this.isAsync = relationshipMeta.options.async;
  this.relationshipMeta = relationshipMeta;
  //This probably breaks for polymorphic relationship in complex scenarios, due to
  //multiple possible typeKeys
  this.inverseKeyForImplicit = this.store.modelFor(this.record.constructor).typeKey + this.key;
  //Cached promise when fetching the relationship from a link
  this.linkPromise = null;
};

Relationship.prototype = {
  constructor: Relationship,

  destroy: Ember.K,

  clear: function() {
    this.members.forEach(function(member) {
      this.removeRecord(member);
    }, this);
  },

  disconnect: function(){
    this.members.forEach(function(member) {
      this.removeRecordFromInverse(member);
    }, this);
  },

  reconnect: function(){
    this.members.forEach(function(member) {
      this.addRecordToInverse(member);
    }, this);
  },

  removeRecords: function(records){
    var that = this;
    records.forEach(function(record){
      that.removeRecord(record);
    });
  },

  addRecords: function(records, idx){
    var that = this;
    records.forEach(function(record){
      that.addRecord(record, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  },

  addRecord: function(record, idx) {
    if (!this.members.has(record)) {
      this.members.add(record);
      this.notifyRecordRelationshipAdded(record, idx);
      if (this.inverseKey) {
        record._relationships[this.inverseKey].addRecord(this.record);
      } else {
        if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, record, this.key,  {options:{}});
        }
        record._implicitRelationships[this.inverseKeyForImplicit].addRecord(this.record);
      }
      this.record.updateRecordArrays();
    }
  },

  removeRecord: function(record) {
    if (this.members.has(record)) {
      this.removeRecordFromOwn(record);
      if (this.inverseKey) {
        this.removeRecordFromInverse(record);
      } else {
        if (record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit].removeRecord(this.record);
        }
      }
    }
  },

  addRecordToInverse: function(record) {
    if (this.inverseKey) {
      record._relationships[this.inverseKey].addRecord(this.record);
    }
  },

  removeRecordFromInverse: function(record) {
    var inverseRelationship = record._relationships[this.inverseKey];
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeRecordFromOwn(this.record);
    }
  },

  removeRecordFromOwn: function(record) {
    this.members.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.record.updateRecordArrays();
  },

  updateLink: function(link) {
    Ember.assert("You have pushed a record of type '" + this.record.constructor.typeKey + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);
    if (link !== this.link) {
      this.link = link;
      this.linkPromise = null;
      this.record.notifyPropertyChange(this.key);
    }
  },

  findLink: function() {
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      var promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then(function(result) {
        return result;
      });
    }
  },

  updateRecordsFromAdapter: function(records) {
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(records);
  },

  notifyRecordRelationshipAdded: Ember.K,
  notifyRecordRelationshipRemoved: Ember.K
};

var ManyRelationship = function(store, record, inverseKey, relationshipMeta) {
  this._super$constructor(store, record, inverseKey, relationshipMeta);
  this.belongsToType = relationshipMeta.type;
  this.manyArray = store.recordArrayManager.createManyArray(this.belongsToType, Ember.A());
  this.manyArray.relationship = this;
  this.isPolymorphic = relationshipMeta.options.polymorphic;
  this.manyArray.isPolymorphic = this.isPolymorphic;
};

ManyRelationship.prototype = Object.create(Relationship.prototype);
ManyRelationship.prototype.constructor = ManyRelationship;
ManyRelationship.prototype._super$constructor = Relationship;

ManyRelationship.prototype.destroy = function() {
  this.manyArray.destroy();
};

ManyRelationship.prototype.notifyRecordRelationshipAdded = function(record, idx) {
  Ember.assert("You cannot add '" + record.constructor.typeKey + "' records to this relationship (only '" + this.belongsToType.typeKey + "' allowed)", !this.belongsToType || record instanceof this.belongsToType);
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
  var members = this.members;
  var recordsToRemove = [];
  var length;
  var record;
  var i;

  records = setForArray(records);

  members.forEach(function(member) {
    if (records.has(member)) return;

    recordsToRemove.push(member);
  });
  this.removeRecords(recordsToRemove);

  var hasManyArray = this.manyArray;

  // Using records.toArray() since currently using
  // removeRecord can modify length, messing stuff up
  // forEach since it directly looks at "length" each
  // iteration
  records = records.toArray();
  length = records.length;
  for (i = 0; i < length; i++){
    record = records[i];
    //Need to preserve the order of incoming records
    if (hasManyArray.objectAt(i) === record ) {
      continue;
    }
    this.removeRecord(record);
    this.addRecord(record, i);
  }
};

ManyRelationship.prototype.fetchLink = function() {
  var self = this;
  return this.store.findHasMany(this.record, this.link, this.relationshipMeta).then(function(records){
    self.updateRecordsFromAdapter(records);
    return self.manyArray;
  });
};

ManyRelationship.prototype.findRecords = function() {
  var manyArray = this.manyArray;
  return this.store.findMany(manyArray.toArray()).then(function(){
    //Goes away after the manyArray refactor
    manyArray.set('isLoaded', true);
    return manyArray;
  });
};

ManyRelationship.prototype.getRecords = function() {
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

    this.manyArray.set('isLoaded', true);
    return this.manyArray;
 }
};

var BelongsToRelationship = function(store, record, inverseKey, relationshipMeta) {
  this._super$constructor(store, record, inverseKey, relationshipMeta);
  this.record = record;
  this.key = relationshipMeta.key;
  this.inverseRecord = null;
};

BelongsToRelationship.prototype = Object.create(Relationship.prototype);
BelongsToRelationship.prototype.constructor = BelongsToRelationship;
BelongsToRelationship.prototype._super$constructor = Relationship;

BelongsToRelationship.prototype.setRecord = function(newRecord) {
  if (newRecord) {
    this.addRecord(newRecord);
  } else if (this.inverseRecord) {
    this.removeRecord(this.inverseRecord);
  }
};

BelongsToRelationship.prototype._super$addRecord = Relationship.prototype.addRecord;
BelongsToRelationship.prototype.addRecord = function(newRecord) {
  if (this.members.has(newRecord)){ return;}
  var type = this.relationshipMeta.type;
  Ember.assert("You can only add a '" + type.typeKey + "' record to this relationship", newRecord instanceof type);

  if (this.inverseRecord) {
    this.removeRecord(this.inverseRecord);
  }

  this.inverseRecord = newRecord;
  this._super$addRecord(newRecord);
};

BelongsToRelationship.prototype.setRecordPromise = function(newPromise) {
  var content = newPromise.get && newPromise.get('content');
  Ember.assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
  this.setRecord(content);
};

BelongsToRelationship.prototype.notifyRecordRelationshipAdded = function(newRecord) {
  this.record.notifyBelongsToAdded(this.key, this);
};

BelongsToRelationship.prototype.notifyRecordRelationshipRemoved = function(record) {
  this.record.notifyBelongsToRemoved(this.key, this);
};

BelongsToRelationship.prototype._super$removeRecordFromOwn = Relationship.prototype.removeRecordFromOwn;
BelongsToRelationship.prototype.removeRecordFromOwn = function(record) {
  if (!this.members.has(record)){ return;}
  this._super$removeRecordFromOwn(record);
  this.inverseRecord = null;
};

BelongsToRelationship.prototype.findRecord = function() {
  if (this.inverseRecord) {
    return this.store._findByRecord(this.inverseRecord);
  } else {
    return Ember.RSVP.Promise.resolve(null);
  }
};

BelongsToRelationship.prototype.fetchLink = function() {
  var self = this;
  return this.store.findBelongsTo(this.record, this.link, this.relationshipMeta).then(function(record){
    self.addRecord(record);
    return record;
  });
};

BelongsToRelationship.prototype.getRecord = function() {
  if (this.isAsync) {
    var promise;
    if (this.link){
      var self = this;
      promise = this.findLink().then(function() {
        return self.findRecord();
      });
    } else {
      promise = this.findRecord();
    }

    return PromiseObject.create({
      promise: promise,
      content: this.inverseRecord
    });
  } else {
    Ember.assert("You looked up the '" + this.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", this.inverseRecord === null || !this.inverseRecord.get('isEmpty'));
    return this.inverseRecord;
  }
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

var createRelationshipFor = function(record, relationshipMeta, store){
  var inverseKey;
  var inverse = record.constructor.inverseFor(relationshipMeta.key);

  if (inverse) {
    inverseKey = inverse.name;
  }

  if (relationshipMeta.kind === 'hasMany'){
    return new ManyRelationship(store, record, inverseKey, relationshipMeta);
  }
  else {
    return new BelongsToRelationship(store, record, inverseKey, relationshipMeta);
  }
};


export {
  Relationship,
  ManyRelationship,
  BelongsToRelationship,
  createRelationshipFor
};
