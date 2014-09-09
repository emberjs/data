import {
  PromiseArray,
  PromiseObject
} from "ember-data/system/promise_proxies";

var Relationship = function(store, record, inverseKey, relationshipMeta) {
  this.members = new Ember.OrderedSet();
  this.store = store;
  this.key = relationshipMeta.key;
  this.inverseKey = inverseKey;
  this.record = record;
  this.key = relationshipMeta.key;
  this.isAsync = relationshipMeta.options.async;
  this.relationshipMeta = relationshipMeta;
  //This probably breaks for polymorphic relationship in complex scenarios, due to
  //multiple possible typeKeys
  this.inversKeyForimplicit = this.typeKey + this.key;
};

Relationship.prototype = {
  constructor: Relationship,
  hasFetchedLink: false,

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
        if (!record._implicitRelationships[this.inverseKeyForimplicit]) {
          record._implicitRelationships[this.inverseKeyForimplicit] = new Relationship(this.store, record, this.key,  {options:{}});
        }
        record._implicitRelationships[this.inverseKeyForimplicit].addRecord(this.record);
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
        if (record._implicitRelationships[this.inverseKeyForimplicit]) {
          record._implicitRelationships[this.inverseKeyForimplicit].removeRecord(this.record);
        }
      }
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
    this.members.remove(record);
    this.notifyRecordRelationshipRemoved(record);
    this.record.updateRecordArrays();
  },

  updateLink: function(link) {
    if (link !== this.link) {
      this.link = link;
      this.hasFetchedLink = false;
      this.record.notifyPropertyChange(this.key);
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

ManyRelationship.prototype.computeChanges = function(records) {
  var members = this.members;

  records = setForArray(records);

  members.forEach(function(member) {
    if (records.has(member)) return;

    this.removeRecord(member);
  }, this);

  var hasManyArray = this.manyArray;

  records.forEach(function(record, index) {
    //Need to preserve the order of incoming records
    if (hasManyArray.objectAt(index) === record ) return;

    this.removeRecord(record);
    this.addRecord(record, index);
  }, this);
};


ManyRelationship.prototype.getRecords = function() {
  if (this.isAsync) {
    var self = this;
    var promise;
    if (this.link && !this.hasFetchedLink) {
      promise = this.store.findHasMany(this.record, this.link, this.relationshipMeta).then(function(records){
        self.updateRecordsFromAdapter(records);
        self.hasFetchedLink = true;
        //TODO(Igor) try to abstract the isLoaded part
        self.manyArray.set('isLoaded', true);
        return self.manyArray;
      });
    } else {
      var manyArray = this.manyArray;
      promise = this.store.findMany(manyArray.toArray()).then(function(){
        self.manyArray.set('isLoaded', true);
        return manyArray;
      });
    }
    return PromiseArray.create({
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

  if (this.inverseRecord && this.inverseKey) {
    this.removeRecord(this.inverseRecord);
  }

  this.inverseRecord = newRecord;
  this._super$addRecord(newRecord);
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

BelongsToRelationship.prototype.getRecord = function() {
  if (this.isAsync) {
    var promise;

    if (this.link && !this.hasFetchedLink){
      var self = this;
      promise = this.store.findBelongsTo(this.record, this.link, this.relationshipMeta).then(function(record){
        self.addRecord(record);
        self.hasFetchedLink = true;
        return record;
      });
    } else if (this.inverseRecord) {
      promise = this.store._findByRecord(this.inverseRecord);
    } else {
      promise = Ember.RSVP.Promise.resolve(null);
    }

    return PromiseObject.create({
      promise: promise
    });
  } else {
    Ember.assert("You looked up the '" + this.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", this.inverseRecord === null || !this.inverseRecord.get('isEmpty'));
    return this.inverseRecord;
  }
};

function setForArray(array) {
  var set = new Ember.OrderedSet();

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
