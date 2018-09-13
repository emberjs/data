import { resolve } from 'rsvp';
import { get } from '@ember/object';
import Reference from './reference';
import { DEBUG } from '@glimmer/env';
import { assertPolymorphicType } from 'ember-data/-debug';

/**
   A HasManyReference is a low-level API that allows users and addon
   author to perform meta-operations on a has-many relationship.

   @class HasManyReference
   @namespace DS
*/
export default class HasManyReference extends Reference {
  constructor(store, parentInternalModel, hasManyRelationship) {
    super(store, parentInternalModel);
    this.hasManyRelationship = hasManyRelationship;
    this.type = hasManyRelationship.relationshipMeta.type;
    this.parent = parentInternalModel.recordReference;
    // TODO inverse
  }

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
  remoteType() {
    if (this.hasManyRelationship.link) {
      return 'link';
    }

    return 'ids';
  }

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
  link() {
    return this.hasManyRelationship.link;
  }

  /**
     `ids()` returns an array of the record IDs in this relationship.

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
  ids() {
    let members = this.hasManyRelationship.members.toArray();

    return members.map(function(internalModel) {
      return internalModel.id;
    });
  }

  /**
     The metadata for the has-many relationship.

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
  meta() {
    return this.hasManyRelationship.meta;
  }

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
  push(objectOrPromise) {
    return resolve(objectOrPromise).then(payload => {
      let array = payload;

      if (typeof payload === 'object' && payload.data) {
        array = payload.data;
      }

      let internalModels;
      internalModels = array.map(obj => {
        let record = this.store.push(obj);

        if (DEBUG) {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(
            this.internalModel,
            relationshipMeta,
            record._internalModel,
            this.store
          );
        }

        return record._internalModel;
      });

      this.hasManyRelationship.computeChanges(internalModels);

      return this.hasManyRelationship.manyArray;
    });
  }

  _isLoaded() {
    let hasRelationshipDataProperty = get(this.hasManyRelationship, 'hasAnyRelationshipData');
    if (!hasRelationshipDataProperty) {
      return false;
    }

    let members = this.hasManyRelationship.members.toArray();

    return members.every(function(internalModel) {
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
  value() {
    if (this._isLoaded()) {
      return this.hasManyRelationship.manyArray;
    }

    return null;
  }

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
    // TODO this can be simplified
    if (!this._isLoaded()) {
      return this.hasManyRelationship.getData(options);
    }

    return resolve(this.hasManyRelationship.manyArray);
  }

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
    return this.hasManyRelationship.reload(options);
  }
}
