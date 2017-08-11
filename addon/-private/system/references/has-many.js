import { A } from '@ember/array';
import { resolve } from 'rsvp';
import { get } from '@ember/object';
import Reference from './reference';
import { DEBUG } from '@glimmer/env';
import { deprecate } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';

import isEnabled from '../../features';

/**
   A HasManyReference is a low level API that allows users and addon
   author to perform meta-operations on a has-many relationship.

   @class HasManyReference
   @namespace DS
*/
const HasManyReference = function(store, parentInternalModel, hasManyRelationship) {
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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

   // get the identifier of the reference
   if (commentsRef.remoteType() === "ids") {
     let ids = commentsRef.ids();
   } else if (commentsRef.remoteType() === "link") {
     let link = commentsRef.link();
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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']
   ```

   @method ids
   @return {Array} The ids in this has-many relationship
*/
HasManyReference.prototype.ids = function() {
  let members = this.hasManyRelationship.members.toArray();

  return members.map(function(internalModel) {
    return internalModel.id;
  });
};

/**
   The meta data for the has-many relationship.

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

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
  return resolve(objectOrPromise).then((payload) => {
    let array = payload;

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
        let record = this.store.push(obj);

        if (DEBUG) {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, record._internalModel);
        }

        return record._internalModel;
      });
    } else {
      let records = this.store.push(payload);
      internalModels = A(records).mapBy('_internalModel');

      if (DEBUG) {
        internalModels.forEach((internalModel) => {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, internalModel);
        });
      }
    }

    this.hasManyRelationship.computeChanges(internalModels);

    return this.hasManyRelationship.manyArray;
  });
};

HasManyReference.prototype._isLoaded = function() {
  let hasData = get(this.hasManyRelationship, 'hasData');
  if (!hasData) {
    return false;
  }

  let members = this.hasManyRelationship.members.toArray();

  return members.every(function(internalModel) {
    return internalModel.isLoaded() === true;
  });
};

/**
   `value()` synchronously returns the current value of the has-many
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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

   post.get('comments').then(function(comments) {
     commentsRef.value() === comments
   })
   ```

   @method value
   @return {DS.ManyArray}
*/
HasManyReference.prototype.value = function() {
  if (this._isLoaded()) {
    return this.hasManyRelationship.manyArray;
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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

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

  return resolve(this.hasManyRelationship.manyArray);
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
   let post = store.push({
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

   let commentsRef = post.hasMany('comments');

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
