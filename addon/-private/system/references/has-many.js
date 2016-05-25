import Ember from 'ember';
import Reference from './reference';
import {
  assertPolymorphicType,
  deprecate,
  runInDebug
} from 'ember-data/-private/debug';

import isEnabled from 'ember-data/-private/features';

const get = Ember.get;

var HasManyReference = function(store, parentInternalModel, hasManyRelationship) {
  this._super$constructor(store, parentInternalModel);
  this.hasManyRelationship = hasManyRelationship;
  this.type = hasManyRelationship.relationshipMeta.type;
  this.parent = parentInternalModel.recordReference;

  // TODO inverse
};

HasManyReference.prototype = Object.create(Reference.prototype);
HasManyReference.prototype.constructor = HasManyReference;
HasManyReference.prototype._super$constructor = Reference;

HasManyReference.prototype.remoteType = function() {
  if (this.hasManyRelationship.link) {
    return "link";
  }

  return "ids";
};

HasManyReference.prototype.link = function() {
  return this.hasManyRelationship.link;
};

HasManyReference.prototype.ids = function() {
  var members = this.hasManyRelationship.members;
  var ids = members.toArray().map(function(internalModel) {
    return internalModel.id;
  });

  return ids;
};

HasManyReference.prototype.meta = function() {
  return this.hasManyRelationship.manyArray.meta;
};

HasManyReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((payload) => {
    var array = payload;

    if (isEnabled("ds-overhaul-references")) {
      deprecate("HasManyReference#push(array) is deprecated. Push a JSON-API document instead.", !Array.isArray(payload), {
        id: 'ds.references.has-many.push-array',
        until: '3.0'
      });
    }

    let useLegacyArrayPush = true;
    if (typeof payload === "object" && payload.data) {
      array = payload.data;
      useLegacyArrayPush = array.length && array[0].data;

      if (isEnabled('ds-overhaul-references')) {
        deprecate("HasManyReference#push() expects a valid JSON-API document.", !useLegacyArrayPush, {
          id: 'ds.references.has-many.push-invalid-json-api',
          until: '3.0'
        });
      }
    }

    if (!isEnabled('ds-overhaul-references')) {
      useLegacyArrayPush = true;
    }

    let internalModels;
    if (useLegacyArrayPush) {
      internalModels = array.map((obj) => {
        var record = this.store.push(obj);

        runInDebug(() => {
          var relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, record._internalModel);
        });

        return record._internalModel;
      });
    } else {
      let records = this.store.push(payload);
      internalModels = Ember.A(records).mapBy('_internalModel');

      runInDebug(() => {
        internalModels.forEach((internalModel) => {
          var relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, internalModel);
        });
      });
    }

    this.hasManyRelationship.computeChanges(internalModels);

    return this.hasManyRelationship.manyArray;
  });
};

HasManyReference.prototype._isLoaded = function() {
  var hasData = get(this.hasManyRelationship, 'hasData');
  if (!hasData) {
    return false;
  }

  var members = this.hasManyRelationship.members.toArray();
  var isEveryLoaded = members.every(function(internalModel) {
    return internalModel.isLoaded() === true;
  });

  return isEveryLoaded;
};

HasManyReference.prototype.value = function() {
  if (this._isLoaded()) {
    return this.hasManyRelationship.manyArray;
  }

  return null;
};

HasManyReference.prototype.load = function() {
  if (!this._isLoaded()) {
    return this.hasManyRelationship.getRecords();
  }

  var manyArray = this.hasManyRelationship.manyArray;
  return Ember.RSVP.resolve(manyArray);
};

HasManyReference.prototype.reload = function() {
  return this.hasManyRelationship.reload();
};

export default HasManyReference;
