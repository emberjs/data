import OrderedSet from "ember-data/system/ordered-set";

var forEach = Ember.EnumerableUtils.forEach;

function Relationship(store, record, inverseKey, relationshipMeta) {
  this.members = new OrderedSet();
  this.canonicalMembers = new OrderedSet();
  this.store = store;
  this.key = relationshipMeta.key;
  this.inverseKey = inverseKey;
  this.record = record;
  this.isAsync = relationshipMeta.options.async;
  this.relationshipMeta = relationshipMeta;
  //This probably breaks for polymorphic relationship in complex scenarios, due to
  //multiple possible modelNames
  this.inverseKeyForImplicit = this.record.constructor.modelName + this.key;
  this.linkPromise = null;
  this.meta = null;
  this.hasData = false;
}

Relationship.prototype = {
  constructor: Relationship,

  destroy: Ember.K,

  updateMeta: function(meta) {
    this.meta = meta;
  },

  clear: function() {
    var members = this.members.list;
    var member;

    while (members.length > 0) {
      member = members[0];
      this.removeRecord(member);
    }
  },

  disconnect: function() {
    this.members.forEach(function(member) {
      this.removeRecordFromInverse(member);
    }, this);
  },

  reconnect: function() {
    this.members.forEach(function(member) {
      this.addRecordToInverse(member);
    }, this);
  },

  removeRecords: function(records) {
    var self = this;
    forEach(records, function(record) {
      self.removeRecord(record);
    });
  },

  addRecords: function(records, idx) {
    var self = this;
    forEach(records, function(record) {
      self.addRecord(record, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  },

  addCanonicalRecords: function(records, idx) {
    for (var i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalRecord(records[i], i+idx);
      } else {
        this.addCanonicalRecord(records[i]);
      }
    }
  },

  addCanonicalRecord: function(record, idx) {
    if (!this.canonicalMembers.has(record)) {
      this.canonicalMembers.add(record);
      if (this.inverseKey) {
        record._relationships.get(this.inverseKey).addCanonicalRecord(this.record);
      } else {
        if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, record, this.key,  { options: {} });
        }
        record._implicitRelationships[this.inverseKeyForImplicit].addCanonicalRecord(this.record);
      }
    }
    this.flushCanonicalLater();
    this.setHasData(true);
  },

  removeCanonicalRecords: function(records, idx) {
    for (var i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalRecord(records[i], i+idx);
      } else {
        this.removeCanonicalRecord(records[i]);
      }
    }
  },

  removeCanonicalRecord: function(record, idx) {
    if (this.canonicalMembers.has(record)) {
      this.removeCanonicalRecordFromOwn(record);
      if (this.inverseKey) {
        this.removeCanonicalRecordFromInverse(record);
      } else {
        if (record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalRecord(this.record);
        }
      }
    }
    this.flushCanonicalLater();
  },

  addRecord: function(record, idx) {
    if (!this.members.has(record)) {
      this.members.addWithIndex(record, idx);
      this.notifyRecordRelationshipAdded(record, idx);
      if (this.inverseKey) {
        record._relationships.get(this.inverseKey).addRecord(this.record);
      } else {
        if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, record, this.key,  { options: {} });
        }
        record._implicitRelationships[this.inverseKeyForImplicit].addRecord(this.record);
      }
      this.record.updateRecordArraysLater();
    }
    this.setHasData(true);
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
      record._relationships.get(this.inverseKey).addRecord(this.record);
    }
  },

  removeRecordFromInverse: function(record) {
    var inverseRelationship = record._relationships.get(this.inverseKey);
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

  removeCanonicalRecordFromInverse: function(record) {
    var inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalRecordFromOwn(this.record);
    }
  },

  removeCanonicalRecordFromOwn: function(record) {
    this.canonicalMembers.delete(record);
    this.flushCanonicalLater();
  },

  flushCanonical: function() {
    this.willSync = false;
    //a hack for not removing new records
    //TODO remove once we have proper diffing
    var newRecords = [];
    for (var i=0; i<this.members.list.length; i++) {
      if (this.members.list[i].isNew()) {
        newRecords.push(this.members.list[i]);
      }
    }
    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (i=0; i<newRecords.length; i++) {
      this.members.add(newRecords[i]);
    }
  },

  flushCanonicalLater: function() {
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    var self = this;
    this.store._backburner.join(function() {
      self.store._backburner.schedule('syncRelationships', self, self.flushCanonical);
    });
  },

  updateLink: function(link) {
    Ember.warn("You have pushed a record of type '" + this.record.type.modelName + "' with '" + this.key + "' as a link, but the association is not an async relationship.", this.isAsync);
    Ember.assert("You have pushed a record of type '" + this.record.type.modelName + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);
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
    //TODO(Igor) move this to a proper place
    var self = this;
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    self.computeChanges(records);
    self.setHasData(true);
  },

  notifyRecordRelationshipAdded: Ember.K,
  notifyRecordRelationshipRemoved: Ember.K,

  setHasData: function(value) {
    this.hasData = value;
  }
};




export default Relationship;
