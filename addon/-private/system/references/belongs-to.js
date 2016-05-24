import Model from 'ember-data/model';
import Ember from 'ember';
import Reference from './reference';

import isEnabled from 'ember-data/-private/features';
import { assertPolymorphicType, deprecate } from "ember-data/-private/debug";

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
    var record;

    if (data instanceof Model) {
      if (isEnabled('ds-overhaul-references')) {
        deprecate("BelongsToReference#push(DS.Model) is deprecated. Update relationship via `model.set('relationshipName', value)` instead.", false, {
          id: 'ds.references.belongs-to.push-record',
          until: '3.0'
        });
      }
      record = data;
    } else {
      record = this.store.push(data);
    }

    assertPolymorphicType(this.internalModel, this.belongsToRelationship.relationshipMeta, record._internalModel);

    this.belongsToRelationship.setCanonicalRecord(record._internalModel);

    return record;
  });
};

BelongsToReference.prototype.value = function() {
  var inverseRecord = this.belongsToRelationship.inverseRecord;

  if (inverseRecord && inverseRecord.record) {
    return inverseRecord.record;
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
