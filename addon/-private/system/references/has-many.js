import Ember from 'ember';
import Reference from './reference';
import {
  assertPolymorphicType,
  assert,
  deprecate,
  runInDebug
} from 'ember-data/-private/debug';

import isEnabled from 'ember-data/-private/features';

const {
  RSVP: { resolve },
  get,
  isArray,
  isEmpty
} = Ember;

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
  return this.hasManyRelationship.meta;
};

HasManyReference.prototype.push = function(objectOrPromise) {
  let { store, hasManyRelationship, internalModel } = this;

  // [ { data: { … }, { data: { … } } ]
  function pushArrayOfResourceObjects(array) {
    let pushedRecords = array.map((data) => store.push(data) );

    return pushRecords(pushedRecords);
  }

  // { data: [ { … }, { … } ] }
  function pushJsonApiDocument(doc) {
    let pushedRecords = store.push(doc);

    // TODO update link & meta using hasManyRelationship.push() once #4599 is merged
    if (doc.meta) {
      hasManyRelationship.updateMeta(doc.meta);
    }
    if (doc.links && doc.links.related) {
      hasManyRelationship.link = doc.links.related.href;
    }

    return pushRecords(pushedRecords);
  }

  // [ <DS.Model>, <DS.Model> ]
  function pushRecords(models) {
    let internalModels = models.map((model) => model._internalModel );

    runInDebug(() => {
      internalModels.forEach((pushedInternalModel) => {
        var relationshipMeta = hasManyRelationship.relationshipMeta;
        assertPolymorphicType(internalModel, relationshipMeta, pushedInternalModel);
      });
    });

    hasManyRelationship.computeChanges(internalModels);

    return hasManyRelationship.getManyArray();
  }

  function isArrayOfResourceObjects(array) {
    return isArray(array) && array[0].hasOwnProperty('data');
  }

  function isArrayOfModels(array) {
    return isArray(array) && array.every((model) => model._internalModel );
  }

  function isObject(obj) {
    return typeof obj === "object";
  }

  function isEmptyArray(possibleArray) {
    return isArray(possibleArray) && isEmpty(possibleArray);
  }

  return resolve(objectOrPromise).then((payload) => {
    // push([])
    if (isEmptyArray(payload)) {
      return pushRecords(payload);
    }

    // push([ { data: { … } }, { data: { … } } ])
    if (isArrayOfResourceObjects(payload)) {
      if (isEnabled("ds-overhaul-references")) {
        deprecate("Calling HasManyReference#push() with an array of the resource objects `[{ data: {} }, { data: {} }]` is deprecated. Push a JSON-API document for a resource collection or an array of records instead.", false, {
          id: 'ds.references.has-many.push.array-of-resource-objects',
          until: '3.0'
        });
      }

      return pushArrayOfResourceObjects(payload);
    }

    // push({ data: [ … ] }) without meta and links properties, as an object of
    // that structure is only supported by ds-overhaul references
    if (isObject(payload) && isArray(payload.data) && !payload.meta && !payload.links) {
      if (!isEmptyArray(payload.data) && isArrayOfResourceObjects(payload.data)) {
        // { data: [ { data: { … } } ] }
        if (isEnabled("ds-overhaul-references")) {
          deprecate("Calling HasManyReference#push() with an argument of the structure `{ data: [{ data: {} }, { data: {} }] }` is deprecated. Push a JSON-API document for a resource collection or an array of records instead.", false, {
            id: 'ds.references.has-many.push.pseudo-json-api-document',
            until: '3.0'
          });
        }

        return pushArrayOfResourceObjects(payload.data);
      }

      // push({ data: [] })
      if (isEmptyArray(payload.data) && !isEnabled("ds-overhaul-references")) {
        return pushRecords([]);
      }
    }

    if (isEnabled("ds-overhaul-references")) {
      // push([<DS.Model:x>, <DS.Model:y>, …])
      if (isArrayOfModels(payload)) {
        return pushRecords(payload);
      }

      // push({ data: [ … ] }) with optional meta and links
      if (isObject(payload)) {
        return pushJsonApiDocument(payload);
      }

      assert("The passed argument to HasManyReference#push() isn't supported. Push a JSON-API document for a resource collection or an array of records instead.");
    } else {
      assert("The passed argument to HasManyReference#push() isn't supported. Push an argument with the structure of `{ data: [{ data: {} }] }` or `[{ data: {} }]` instead.");
    }
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
    return this.hasManyRelationship.getManyArray();
  }

  return null;
};

HasManyReference.prototype.load = function() {
  if (!this._isLoaded()) {
    return this.hasManyRelationship.getRecords();
  }

  return resolve(this.hasManyRelationship.getManyArray());
};

HasManyReference.prototype.reload = function() {
  return this.hasManyRelationship.reload();
};

export default HasManyReference;
