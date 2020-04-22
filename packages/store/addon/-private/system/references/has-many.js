import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import { assertPolymorphicType } from '@ember-data/store/-debug';

import recordDataFor from '../record-data-for';
import Reference, { INTERNAL_MODELS } from './reference';

/**
  @module @ember-data/store
*/

/**
 A `HasManyReference` is a low-level API that allows users and addon
 authors to perform meta-operations on a has-many relationship.

 @class HasManyReference
 @extends Reference
 */
export default class HasManyReference extends Reference {
  constructor(store, parentInternalModel, hasManyRelationship, key) {
    super(store, parentInternalModel);
    this.key = key;
    this.hasManyRelationship = hasManyRelationship;
    this.type = hasManyRelationship.relationshipMeta.type;
    this.parent = parentInternalModel.recordReference;
    this.parentInternalModel = parentInternalModel;

    // TODO inverse
  }

  _resource() {
    return INTERNAL_MODELS.get(this)?._recordData.getHasMany(this.key);
  }

  /**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
     comments: hasMany({ async: true })
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
   @return {String} The name of the remote type. This should either be `link` or `ids`
   */
  remoteType() {
    let value = this._resource();
    if (value && value.links && value.links.related) {
      return 'link';
    }

    return 'ids';
  }

  /**
   `ids()` returns an array of the record IDs in this relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
     comments: hasMany({ async: true })
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
  ids() {
    let resource = this._resource();

    let ids = [];
    if (resource.data) {
      ids = resource.data.map(data => data.id);
    }

    return ids;
  }

  /**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the canonical value of this
   relationship on the backend.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
     comments: hasMany({ async: true })
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
   @return {ManyArray}
   */
  push(objectOrPromise) {
    return resolve(objectOrPromise).then(payload => {
      let array = payload;

      if (typeof payload === 'object' && payload.data) {
        array = payload.data;
      }

      let internalModel = INTERNAL_MODELS.get(this);

      let internalModels = array.map(obj => {
        let record = this.store.push(obj);

        if (DEBUG) {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(internalModel, relationshipMeta, record._internalModel, this.store);
        }
        return recordDataFor(record);
      });

      this.hasManyRelationship.computeChanges(internalModels);

      return internalModel.getHasMany(this.hasManyRelationship.key);
      // TODO IGOR it seems wrong that we were returning the many array here
      //return this.hasManyRelationship.manyArray;
    });
  }

  _isLoaded() {
    let hasRelationshipDataProperty = this.hasManyRelationship.hasAnyRelationshipData;
    if (!hasRelationshipDataProperty) {
      return false;
    }

    let members = this.hasManyRelationship.members.toArray();

    //TODO Igor cleanup
    return members.every(recordData => {
      let store = this.parentInternalModel.store;
      let internalModel = store._internalModelForResource(recordData.getResourceIdentifier());
      return internalModel.isLoaded() === true;
    });
  }

  /**
   `value()` synchronously returns the current value of the has-many
   relationship. Unlike `record.get('relationshipName')`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
     comments: hasMany({ async: true })
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
   @return {ManyArray}
   */
  value() {
    let internalModel = INTERNAL_MODELS.get(this);
    if (this._isLoaded()) {
      return internalModel.getManyArray(this.key);
    }

    return null;
  }

  /**
   Loads the relationship if it is not already loaded.  If the
   relationship is already loaded this method does not trigger a new
   load. This causes a request to the specified
   relationship link or reloads all items currently in the relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
     comments: hasMany({ async: true })
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

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference.

   Example

   ```javascript
   commentsRef.load({ adapterOptions: { isPrivate: true } })
     .then(function(comments) {
       //...
     });
   ```

   ```app/adapters/comment.js
   export default ApplicationAdapter.extend({
     findMany(store, type, id, snapshots) {
       // In the adapter you will have access to adapterOptions.
       let adapterOptions = snapshots[0].adapterOptions;
     }
   });
   ```

   @method load
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the ManyArray in
   this has-many relationship.
   */
  load(options) {
    let internalModel = INTERNAL_MODELS.get(this);
    return internalModel.getHasMany(this.key, options);
  }

  /**
   Reloads this has-many relationship. This causes a request to the specified
   relationship link or reloads all items currently in the relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
     comments: hasMany({ async: true })
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

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference. A full example
   can be found in the `load` method.

   Example

   ```javascript
   commentsRef.reload({ adapterOptions: { isPrivate: true } })
   ```

   @method reload
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the ManyArray in this has-many relationship.
   */
  reload(options) {
    let internalModel = INTERNAL_MODELS.get(this);
    return internalModel.reloadHasMany(this.key, options);
  }
}
