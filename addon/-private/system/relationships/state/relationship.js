/* global heimdall */
import { assert, warn } from "ember-data/-private/debug";
import OrderedSet from "ember-data/-private/system/ordered-set";
import _normalizeLink from "ember-data/-private/system/normalize-link";

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
  push,
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
  'push',
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

export default class Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    heimdall.increment(newRelationship);
    let async = relationshipMeta.options.async;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.internalModel = internalModel;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
    this.linkPromise = null;
    this.meta = null;
    this.hasData = false;
    this.hasLoaded = false;
  }

  // TODO @runspired deprecate this as it was never truly a record instance
  get record() {
    return this.internalModel;
  }

  get parentType() {
    return this.internalModel.modelName;
  }

  destroy() {
    if (!this.inverseKey) { return; }

    let allMembers =
      // we actually want a union of members and canonicalMembers
      // they should be disjoint but currently are not due to a bug
      this.members.toArray().concat(this.canonicalMembers.toArray());

    allMembers.forEach(inverseInternalModel => {
      let relationship = inverseInternalModel._relationships.get(this.inverseKey);
      // TODO: there is always a relationship in this case; this guard exists
      // because there are tests that fail in teardown after putting things in
      // invalid state
      if (relationship) {
        relationship.inverseDidDematerialize();
      }
    });
  }

  inverseDidDematerialize() {}

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  }

  clear() {
    heimdall.increment(clear);

    let members = this.members.list;
    while (members.length > 0) {
      let member = members[0];
      this.removeRecord(member);
    }

    let canonicalMembers = this.canonicalMembers.list;
    while (canonicalMembers.length > 0) {
      let member = canonicalMembers[0];
      this.removeCanonicalRecord(member);
    }
  }

  removeRecords(records) {
    heimdall.increment(removeRecords);
    records.forEach((record) => this.removeRecord(record));
  }

  addRecords(records, idx) {
    heimdall.increment(addRecords);
    records.forEach((record) => {
      this.addRecord(record, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalRecords(records, idx) {
    heimdall.increment(addCanonicalRecords);
    for (let i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalRecord(records[i], i+idx);
      } else {
        this.addCanonicalRecord(records[i]);
      }
    }
  }

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
  }

  removeCanonicalRecords(records, idx) {
    heimdall.increment(removeCanonicalRecords);
    for (let i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalRecord(records[i], i+idx);
      } else {
        this.removeCanonicalRecord(records[i]);
      }
    }
  }

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
  }

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
      this.record.updateRecordArrays();
    }
    this.setHasData(true);
  }

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
  }

  removeRecordFromInverse(record) {
    heimdall.increment(removeRecordFromInverse);
    let inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeRecordFromOwn(this.record);
    }
  }

  removeRecordFromOwn(record) {
    heimdall.increment(removeRecordFromOwn);
    this.members.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.record.updateRecordArrays();
  }

  removeCanonicalRecordFromInverse(record) {
    heimdall.increment(removeCanonicalRecordFromInverse);
    let inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalRecordFromOwn(this.record);
    }
  }

  removeCanonicalRecordFromOwn(record) {
    heimdall.increment(removeCanonicalRecordFromOwn);
    this.canonicalMembers.delete(record);
    this.flushCanonicalLater();
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.members.list;
    this.willSync = false;
    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newRecords = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].isNew()) {
        newRecords.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newRecords.length; i++) {
      this.members.add(newRecords[i]);
    }
  }

  flushCanonicalLater() {
    heimdall.increment(flushCanonicalLater);
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    this.store._updateRelationshipState(this);
  }

  updateLink(link) {
    heimdall.increment(updateLink);
    warn(`You pushed a record of type '${this.record.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert("You have pushed a record of type '" + this.record.modelName + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;
    this.record.notifyPropertyChange(this.key);
  }

  findLink() {
    heimdall.increment(findLink);
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      let promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then((result) => result);
    }
  }

  updateRecordsFromAdapter(records) {
    heimdall.increment(updateRecordsFromAdapter);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(records);
  }

  notifyRecordRelationshipAdded() { }
  notifyRecordRelationshipRemoved() { }

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
  }

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

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload) {
    heimdall.increment(push);

    let hasData = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasData = true;
      this.updateData(payload.data);
    }

    if (payload.links && payload.links.related) {
      let relatedLink = _normalizeLink(payload.links.related);
      if (relatedLink && relatedLink.href && relatedLink.href !== this.link) {
        hasLink = true;
        this.updateLink(relatedLink.href);
      }
    }

    /*
     Data being pushed into the relationship might contain only data or links,
     or a combination of both.

     If we got data we want to set both hasData and hasLoaded to true since
     this would indicate that we should prefer the local state instead of
     trying to fetch the link or call findRecord().

     If we have no data but a link is present we want to set hasLoaded to false
     without modifying the hasData flag. This will ensure we fetch the updated
     link next time the relationship is accessed.
     */
    if (hasData) {
      this.setHasData(true);
      this.setHasLoaded(true);
    } else if (hasLink) {
      this.setHasLoaded(false);
    }
  }

  updateData() {}
}
