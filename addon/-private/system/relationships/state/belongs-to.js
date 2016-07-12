import Ember from 'ember';
import { assert } from "ember-data/-private/debug";
import {
  PromiseObject
} from "ember-data/-private/system/promise-proxies";

import { assertPolymorphicType } from "ember-data/-private/debug";

import Relationship from "ember-data/-private/system/relationships/state/relationship";

export default function BelongsToRelationship(store, record, inverseKey, relationshipMeta) {
  this._super$constructor(store, record, inverseKey, relationshipMeta);
  this.record = record;
  this.key = relationshipMeta.key;
  this.inverseRecord = null;
  this.canonicalState = null;
}

BelongsToRelationship.prototype = Object.create(Relationship.prototype);
BelongsToRelationship.prototype.constructor = BelongsToRelationship;
BelongsToRelationship.prototype._super$constructor = Relationship;

BelongsToRelationship.prototype.setRecord = function(newRecord) {
  if (newRecord) {
    this.addRecord(newRecord);
  } else if (this.inverseRecord) {
    this.removeRecord(this.inverseRecord);
  }
  this.setHasData(true);
  this.setHasLoaded(true);
};

BelongsToRelationship.prototype.setCanonicalRecord = function(newRecord) {
  if (newRecord) {
    this.addCanonicalRecord(newRecord);
  } else if (this.canonicalState) {
    this.removeCanonicalRecord(this.canonicalState);
  }
  this.flushCanonicalLater();
  this.setHasData(true);
  this.setHasLoaded(true);
};

BelongsToRelationship.prototype._super$addCanonicalRecord = Relationship.prototype.addCanonicalRecord;
BelongsToRelationship.prototype.addCanonicalRecord = function(newRecord) {
  if (this.canonicalMembers.has(newRecord)) { return;}

  if (this.canonicalState) {
    this.removeCanonicalRecord(this.canonicalState);
  }

  this.canonicalState = newRecord;
  this._super$addCanonicalRecord(newRecord);
};

BelongsToRelationship.prototype._super$flushCanonical = Relationship.prototype.flushCanonical;
BelongsToRelationship.prototype.flushCanonical = function() {
  //temporary fix to not remove newly created records if server returned null.
  //TODO remove once we have proper diffing
  if (this.inverseRecord && this.inverseRecord.isNew() && !this.canonicalState) {
    return;
  }
  this.inverseRecord = this.canonicalState;
  this.record.notifyBelongsToChanged(this.key);
  this._super$flushCanonical();
};

BelongsToRelationship.prototype._super$addRecord = Relationship.prototype.addRecord;
BelongsToRelationship.prototype.addRecord = function(newRecord) {
  if (this.members.has(newRecord)) { return;}

  assertPolymorphicType(this.record, this.relationshipMeta, newRecord);

  if (this.inverseRecord) {
    this.removeRecord(this.inverseRecord);
  }

  this.inverseRecord = newRecord;
  this._super$addRecord(newRecord);
  this.record.notifyBelongsToChanged(this.key);
};

BelongsToRelationship.prototype.setRecordPromise = function(newPromise) {
  var content = newPromise.get && newPromise.get('content');
  assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
  this.setRecord(content ? content._internalModel : content);
};

BelongsToRelationship.prototype._super$removeRecordFromOwn = Relationship.prototype.removeRecordFromOwn;
BelongsToRelationship.prototype.removeRecordFromOwn = function(record) {
  if (!this.members.has(record)) { return;}
  this.inverseRecord = null;
  this._super$removeRecordFromOwn(record);
  this.record.notifyBelongsToChanged(this.key);
};

BelongsToRelationship.prototype._super$removeCanonicalRecordFromOwn = Relationship.prototype.removeCanonicalRecordFromOwn;
BelongsToRelationship.prototype.removeCanonicalRecordFromOwn = function(record) {
  if (!this.canonicalMembers.has(record)) { return;}
  this.canonicalState = null;
  this._super$removeCanonicalRecordFromOwn(record);
};

BelongsToRelationship.prototype.findRecord = function() {
  if (this.inverseRecord) {
    return this.store._findByInternalModel(this.inverseRecord);
  } else {
    return Ember.RSVP.Promise.resolve(null);
  }
};

BelongsToRelationship.prototype.fetchLink = function() {
  return this.store.findBelongsTo(this.record, this.link, this.relationshipMeta).then((record) => {
    if (record) {
      this.addRecord(record);
    }
    return record;
  });
};

BelongsToRelationship.prototype.getRecord = function() {
  //TODO(Igor) flushCanonical here once our syncing is not stupid
  if (this.isAsync) {
    var promise;
    if (this.link) {
      if (this.hasLoaded) {
        promise = this.findRecord();
      } else {
        promise = this.findLink().then(() => this.findRecord());
      }
    } else {
      promise = this.findRecord();
    }

    return PromiseObject.create({
      promise: promise,
      content: this.inverseRecord ? this.inverseRecord.getRecord() : null
    });
  } else {
    if (this.inverseRecord === null) {
      return null;
    }
    var toReturn = this.inverseRecord.getRecord();
    assert("You looked up the '" + this.key + "' relationship on a '" + this.record.type.modelName + "' with id " + this.record.id +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", toReturn === null || !toReturn.get('isEmpty'));
    return toReturn;
  }
};

BelongsToRelationship.prototype.reload = function() {
  // TODO handle case when reload() is triggered multiple times

  if (this.link) {
    return this.fetchLink();
  }

  // reload record, if it is already loaded
  if (this.inverseRecord && this.inverseRecord.record) {
    return this.inverseRecord.record.reload();
  }

  return this.findRecord();
};
