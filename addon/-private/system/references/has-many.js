import { resolve } from 'rsvp';
import { get } from '@ember/object';
import Reference from './reference';
import { DEBUG } from '@glimmer/env';
import { assertPolymorphicType } from 'ember-data/-debug';

/**
 A HasManyReference is a low level API that allows users and addon
 author to perform meta-operations on a has-many relationship.

 @class HasManyReference
 @namespace DS
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
    return this.modelData.getHasMany(this.key);
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
    let value = this._resource();
    if (value && value.links && value.links.related) {
      return "link";
    }

    return "ids";
  }


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
  ids() {
    let resource = this._resource();

    let ids = [];
    if (resource.data) {
      ids = resource.data.map((data) => data.id);
    }

    return ids;
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
    return resolve(objectOrPromise).then((payload) => {
      let array = payload;

      if (typeof payload === "object" && payload.data) {
        array = payload.data;
      }

      let internalModels = array.map((obj) => {
        let record = this.store.push(obj);

        if (DEBUG) {
          let relationshipMeta = this.hasManyRelationship.relationshipMeta;
          assertPolymorphicType(this.internalModel, relationshipMeta, record._internalModel, this.store);
        }
        return record._internalModel._modelData;
      });

      this.hasManyRelationship.computeChanges(internalModels);

      return this.internalModel.getHasMany(this.hasManyRelationship.key);
      // TODO IGOR it seems wrong that we were returning the many array here
      //return this.hasManyRelationship.manyArray;
    });
  }

  _isLoaded() {
    let hasData = get(this.hasManyRelationship, 'hasData');
    if (!hasData) {
      return false;
    }

    let members = this.hasManyRelationship.members.toArray();

    //TODO Igor cleanup
    return members.every((modelData) => {
      let store = this.parentInternalModel.store;
      let internalModel = store._internalModelForModelData(modelData);
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
      return this.internalModel.getManyArray(this.key);
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

   @method load
   @return {Promise} a promise that resolves with the ManyArray in
   this has-many relationship.
   */
  load() {
    return this.internalModel.getHasMany(this.key);
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

   @method reload
   @return {Promise} a promise that resolves with the ManyArray in this has-many relationship.
   */
  reload() {
    return this.internalModel.reloadHasMany(this.key);
  }
}
