/* global heimdall */
import Ember from 'ember';
import { assert, warn } from "ember-data/-private/debug";
import OrderedSet from "ember-data/-private/system/ordered-set";

const {
  addCanonicalRecord,
  addCanonicalRecords,
  addRecord,
  addRecords,
  clear,
  findLink,
  flushCanonical,
  flushCanonicalLater,
  newRelationship,
  removeCanonicalRecord,
  removeCanonicalRecordFromInverse,
  removeCanonicalRecordFromOwn,
  removeCanonicalRecords,
  removeRecord,
  removeRecordFromInverse,
  removeRecordFromOwn,
  removeRecords,
  setHasData,
  setHasLoaded,
  updateLink,
  updateMeta,
  updateRecordsFromAdapter
} = heimdall.registerMonitor('system.relationships.state.relationship',
  'addCanonicalRecord',
  'addCanonicalRecords',
  'addRecord',
  'addRecords',
  'clear',
  'findLink',
  'flushCanonical',
  'flushCanonicalLater',
  'newRelationship',
  'removeCanonicalRecord',
  'removeCanonicalRecordFromInverse',
  'removeCanonicalRecordFromOwn',
  'removeCanonicalRecords',
  'removeRecord',
  'removeRecordFromInverse',
  'removeRecordFromOwn',
  'removeRecords',
  'setHasData',
  'setHasLoaded',
  'updateLink',
  'updateMeta',
  'updateRecordsFromAdapter'
);

export default function Relationship(store, record, inverseKey, relationshipMeta) {
  heimdall.increment(newRelationship);
  var async = relationshipMeta.options.async;
  this.members = new OrderedSet();
  this.canonicalMembers = new OrderedSet();
  this.store = store;
  this.key = relationshipMeta.key;
  this.inverseKey = inverseKey;
  this.record = record;
  this.isAsync = typeof async === 'undefined' ? true : async;
  this.relationshipMeta = relationshipMeta;
  //This probably breaks for polymorphic relationship in complex scenarios, due to
  //multiple possible modelNames
  this.inverseKeyForImplicit = this.record.constructor.modelName + this.key;
  this.linkPromise = null;
  this.meta = null;
  this.hasData = false;
  this.hasLoaded = false;
}

Relationship.prototype = {
  constructor: Relationship,

  destroy: Ember.K,

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  },

  clear() {
    heimdall.increment(clear);
    var members = this.members.list;
    var member;

    while (members.length > 0) {
      member = members[0];
      this.removeRecord(member);
    }
  },

  removeRecords(records) {
    heimdall.increment(removeRecords);
    records.forEach((record) => this.removeRecord(record));
  },

  addRecords(records, idx) {
    heimdall.increment(addRecords);
    records.forEach((record) => {
      this.addRecord(record, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  },

  addCanonicalRecords(records, idx) {
    heimdall.increment(addCanonicalRecords);
    for (var i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalRecord(records[i], i+idx);
      } else {
        this.addCanonicalRecord(records[i]);
      }
    }
  },

  addCanonicalRecord(record, idx) {
    heimdall.increment(addCanonicalRecord);
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

  removeCanonicalRecords(records, idx) {
    heimdall.increment(removeCanonicalRecords);
    for (var i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalRecord(records[i], i+idx);
      } else {
        this.removeCanonicalRecord(records[i]);
      }
    }
  },

  removeCanonicalRecord(record, idx) {
    heimdall.increment(removeCanonicalRecord);
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

  addRecord(record, idx) {
    heimdall.increment(addRecord);
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

  removeRecord(record) {
    heimdall.increment(removeRecord);
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

  removeRecordFromInverse(record) {
    heimdall.increment(removeRecordFromInverse);
    var inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeRecordFromOwn(this.record);
    }
  },

  removeRecordFromOwn(record) {
    heimdall.increment(removeRecordFromOwn);
    this.members.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.record.updateRecordArrays();
  },

  removeCanonicalRecordFromInverse(record) {
    heimdall.increment(removeCanonicalRecordFromInverse);
    var inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalRecordFromOwn(this.record);
    }
  },

  removeCanonicalRecordFromOwn(record) {
    heimdall.increment(removeCanonicalRecordFromOwn);
    this.canonicalMembers.delete(record);
    this.flushCanonicalLater();
  },

  flushCanonical() {
    heimdall.increment(flushCanonical);
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

  flushCanonicalLater() {
    heimdall.increment(flushCanonicalLater);
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    this.store._backburner.join(() => this.store._backburner.schedule('syncRelationships', this, this.flushCanonical));
  },

  updateLink(link) {
    heimdall.increment(updateLink);
    warn(`You have pushed a record of type '${this.record.type.modelName}' with '${this.key}' as a link, but the association is not an async relationship.`, this.isAsync, {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert("You have pushed a record of type '" + this.record.type.modelName + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);
    if (link !== this.link) {
      this.link = link;
      this.linkPromise = null;
      this.setHasLoaded(false);
      this.record.notifyPropertyChange(this.key);
    }
  },

  findLink() {
    heimdall.increment(findLink);
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      var promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then((result) => result);
    }
  },

  updateRecordsFromAdapter(records) {
    heimdall.increment(updateRecordsFromAdapter);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(records);
    this.setHasData(true);
    this.setHasLoaded(true);
  },

  notifyRecordRelationshipAdded: Ember.K,
  notifyRecordRelationshipRemoved: Ember.K,

  /*
    `hasData` for a relationship is a flag to indicate if we consider the
    content of this relationship "known". Snapshots uses this to tell the
    difference between unknown (`undefined`) or empty (`null`). The reason for
    this is that we wouldn't want to serialize unknown relationships as `null`
    as that might overwrite remote state.

    All relationships for a newly created (`store.createRecord()`) are
    considered known (`hasData === true`).
   */
  setHasData(value) {
    heimdall.increment(setHasData);
    this.hasData = value;
  },

  /*
    `hasLoaded` is a flag to indicate if we have gotten data from the adapter or
    not when the relationship has a link.

    This is used to be able to tell when to fetch the link and when to return
    the local data in scenarios where the local state is considered known
    (`hasData === true`).

    Updating the link will automatically set `hasLoaded` to `false`.
   */
  setHasLoaded(value) {
    heimdall.increment(setHasLoaded);
    this.hasLoaded = value;
  }
};
