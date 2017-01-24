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

/**
   A HasManyReference is a low level API that allows users and addon
   author to perform meta-operations on a has-many relationship.

   @class HasManyReference
   @namespace DS
*/
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

/**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   // get the identifier of the reference
   if (commentsRef.remoteType() === "ids") {
     var ids = commentsRef.ids();
   } else if (commentsRef.remoteType() === "link") {
     var link = commentsRef.link();
   }
   ```

   @method remoteType
   @return {String} The name of the remote type. This should either be "link" or "ids"
*/
HasManyReference.prototype.remoteType = function() {
  if (this.hasManyRelationship.link) {
    return "link";
  }

  return "ids";
};

/**
   The link Ember Data will use to fetch or reload this has-many
   relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           links: {
             related: '/posts/1/comments'
           }
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   commentsRef.link(); // '/posts/1/comments'
   ```

   @method link
   @return {String} The link Ember Data will use to fetch or reload this has-many relationship.
*/
HasManyReference.prototype.link = function() {
  return this.hasManyRelationship.link;
};

/**
   `ids()` returns an array of the record ids in this relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']
   ```

   @method remoteType
   @return {Array} The ids in this has-many relationship
*/
HasManyReference.prototype.ids = function() {
  let members = this.hasManyRelationship.members.toArray();

  return members.map(function(internalModel) {
    return internalModel.id;
  });
};

/**
   The link Ember Data will use to fetch or reload this has-many
   relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           links: {
             related: {
               href: '/posts/1/comments',
               meta: {
                 count: 10
               }
             }
           }
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   commentsRef.meta(); // { count: 10 }
   ```

   @method meta
   @return {Object} The meta information for the has-many relationship.
*/
HasManyReference.prototype.meta = function() {
  return this.hasManyRelationship.meta;
};

/**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the canonical value of this
   relationship on the backend.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']

   commentsRef.push([
     [{ type: 'comment', id: 2 }],
     [{ type: 'comment', id: 3 }],
   ])

   commentsRef.ids(); // ['2', '3']
   ```

   @method push
   @param {Array|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {DS.ManyArray}
*/
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

  let members = this.hasManyRelationship.members.toArray();

  return members.every(function(internalModel) {
    return internalModel.isLoaded() === true;
  });
};

/**
   `value()` sycronously returns the current value of the has-many
    relationship. Unlike `record.get('relationshipName')`, calling
    `value()` on a reference does not trigger a fetch if the async
    relationship is not yet loaded. If the relationship is not loaded
    it will always return `null`.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   post.get('comments').then(function(comments) {
     commentsRef.value() === comments
   })
   ```

   @method value
   @return {DS.ManyArray}
*/
HasManyReference.prototype.value = function() {
  if (this._isLoaded()) {
    return this.hasManyRelationship.getManyArray();
  }

  return null;
};

/**
   Loads the relationship if it is not already loaded.  If the
   relationship is already loaded this method does not trigger a new
   load.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   commentsRef.load().then(function(comments) {
     //...
   });
   ```

   @method load
   @return {Promise} a promise that resolves with the ManyArray in
   this has-many relationship.
*/
HasManyReference.prototype.load = function() {
  if (!this._isLoaded()) {
    return this.hasManyRelationship.getRecords();
  }

  return resolve(this.hasManyRelationship.getManyArray());
};

/**
   Reloads this has-many relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   var post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   var commentsRef = post.hasMany('comments');

   commentsRef.reload().then(function(comments) {
     //...
   });
   ```

   @method reload
   @return {Promise} a promise that resolves with the ManyArray in this has-many relationship.
*/
HasManyReference.prototype.reload = function() {
  return this.hasManyRelationship.reload();
};

export default HasManyReference;
