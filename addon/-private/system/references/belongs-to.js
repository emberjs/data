import Model from 'ember-data/model';
import Ember from 'ember';
import Reference from './reference';

import { assertPolymorphicType } from "ember-data/-private/debug";

var BelongsToReference = function(store, parentInternalModel, belongsToRelationship) {
  this._super$constructor(store, parentInternalModel);
  this.belongsToRelationship = belongsToRelationship;
  this.type = belongsToRelationship.relationshipMeta.type;
  this.parent = parentInternalModel.recordReference;

  // TODO inverse
};

BelongsToReference.prototype = Object.create(Reference.prototype);
BelongsToReference.prototype.constructor = BelongsToReference;
BelongsToReference.prototype._super$constructor = Reference;

BelongsToReference.prototype.remoteType = function() {
  if (this.belongsToRelationship.link) {
    return "link";
  }

  return "id";
};

BelongsToReference.prototype.id = function() {
  var inverseRecord = this.belongsToRelationship.inverseRecord;
  return inverseRecord && inverseRecord.id;
};

BelongsToReference.prototype.link = function() {
  return this.belongsToRelationship.link;
};

BelongsToReference.prototype.meta = function() {
  return this.belongsToRelationship.meta;
};

BelongsToReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((data) => {
    let record, related, meta;

    if (data instanceof Model) {
      record = data;
    } else {
      record = this.store.push(data);

      meta = data.meta;
      related = data.links && data.links.related && data.links.related.href;
    }

    assertPolymorphicType(this.internalModel, this.belongsToRelationship.relationshipMeta, record._internalModel);

    this.belongsToRelationship.setCanonicalRecord(record._internalModel);

    // TODO use belongsToRelationship.push() once #4599 is merged
    if (meta) {
      this.belongsToRelationship.meta = meta;
    }
    if (related) {
      this.belongsToRelationship.link = related;
    }

    return record;
  });
};

BelongsToReference.prototype.value = function() {
  var inverseRecord = this.belongsToRelationship.inverseRecord;

  if (inverseRecord && inverseRecord.isLoaded()) {
    return inverseRecord.getRecord();
  }

  return null;
};

BelongsToReference.prototype.load = function() {
  if (this.remoteType() === "id") {
    return this.belongsToRelationship.getRecord();
  }

  if (this.remoteType() === "link") {
    return this.belongsToRelationship.findLink().then((internalModel) => {
      return this.value();
    });
  }
};

BelongsToReference.prototype.reload = function() {
  return this.belongsToRelationship.reload().then((internalModel) => {
    return this.value();
  });
};

export default BelongsToReference;
