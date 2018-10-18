import { resolve } from 'rsvp';
import { assertPolymorphicType } from 'ember-data/-debug';
import Model from '../model/model';
import Reference from './reference';

/**
 A BelongsToReference is a low-level API that allows users and
 addon author to perform meta-operations on a belongs-to
 relationship.

 @class BelongsToReference
 @namespace DS
 @extends DS.Reference
 */
export default class BelongsToReference extends Reference {
  constructor(store, parentInternalModel, belongsToRelationship, key) {
    super(store, parentInternalModel);
    this.key = key;
    this.belongsToRelationship = belongsToRelationship;
    this.type = belongsToRelationship.relationshipMeta.type;
    this.parent = parentInternalModel.recordReference;
    this.parentInternalModel = parentInternalModel;

    // TODO inverse
  }

  /**
   The `id` of the record that this reference refers to. Together, the
   `type()` and `id()` methods form a composite key for the identity
   map. This can be used to access the id of an async relationship
   without triggering a fetch that would normally happen if you
   attempted to use `record.get('relationship.id')`.

   Example

   ```javascript
   // models/blog.js
   export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   // get the identifier of the reference
   if (userRef.remoteType() === "id") {
      let id = userRef.id();
    }
   ```

   @method id
   @return {String} The id of the record in this belongsTo relationship.
   */
  id() {
    let id = null;
    let resource = this._resource();
    if (resource && resource.data && resource.data.id) {
      id = resource.data.id;
    }
    return id;
  }

  _resource() {
    return this.recordData.getBelongsTo(this.key);
  }

  /**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the conanical value of this
   relationship on the backend.

   Example

   ```javascript
   // models/blog.js
   export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   // provide data for reference
   userRef.push({
      data: {
        type: 'user',
        id: 1,
        attributes: {
          username: "@user"
        }
      }
    }).then(function(user) {
      userRef.value() === user;
    });
   ```

   @method push
   @param {Object|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {Promise<record>} A promise that resolves with the new value in this belongs-to relationship.
   */
  push(objectOrPromise) {
    return resolve(objectOrPromise).then(data => {
      let record;

      // TODO deprecate data as Model
      if (data instanceof Model) {
        record = data;
      } else {
        record = this.store.push(data);
      }

      assertPolymorphicType(
        this.internalModel,
        this.belongsToRelationship.relationshipMeta,
        record._internalModel,
        this.store
      );

      //TODO Igor cleanup, maybe move to relationship push
      this.belongsToRelationship.setCanonicalRecordData(record._internalModel._recordData);

      return record;
    });
  }

  /**
   `value()` synchronously returns the current value of the belongs-to
   relationship. Unlike `record.get('relationshipName')`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

   ```javascript
   // models/blog.js
   export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   userRef.value(); // null

   // provide data for reference
   userRef.push({
      data: {
        type: 'user',
        id: 1,
        attributes: {
          username: "@user"
        }
      }
    }).then(function(user) {
      userRef.value(); // user
    });
   ```

   @method value
   @return {DS.Model} the record in this relationship
   */
  value() {
    let store = this.parentInternalModel.store;
    let resource = this._resource();
    if (resource && resource.data) {
      let inverseInternalModel = store._internalModelForResource(resource.data);
      if (inverseInternalModel && inverseInternalModel.isLoaded()) {
        return inverseInternalModel.getRecord();
      }
    }

    return null;
  }

  /**
   Loads a record in a belongs to relationship if it is not already
   loaded. If the relationship is already loaded this method does not
   trigger a new load.

   Example

   ```javascript
   // models/blog.js
   export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   userRef.value(); // null

   userRef.load().then(function(user) {
      userRef.value() === user
    });
   ```

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference.

   Example

   ```javascript
   userRef.load({ adapterOptions: { isPrivate: true } }).then(function(user) {
     userRef.value() === user;
   });
   ```

   ```app/adapters/user.js
   export default ApplicationAdapter.extend({
     findRecord(store, type, id, snapshot) {
       // In the adapter you will have access to adapterOptions.
       let adapterOptions = snapshot.adapterOptions;
     }
   });
   ```

   @method load
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the record in this belongs-to relationship.
   */
  load(options) {
    return this.parentInternalModel.getBelongsTo(this.key, options);
  }

  /**
   Triggers a reload of the value in this relationship. If the
   remoteType is `"link"` Ember Data will use the relationship link to
   reload the relationship. Otherwise it will reload the record by its
   id.

   Example

   ```javascript
   // models/blog.js
   export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   userRef.reload().then(function(user) {
      userRef.value() === user
    });
   ```

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference. A full example
   can be found in the `load` method.

   Example

   ```javascript
   userRef.reload({ adapterOptions: { isPrivate: true } })
   ```

   @method reload
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the record in this belongs-to relationship after the reload has completed.
   */
  // TODO IGOR CHECK FOR OBJECT PROXIES
  reload(options) {
    let resource = this._resource();
    if (resource && resource.links && resource.links.related) {
      return this.store._fetchBelongsToLinkFromResource(
        resource,
        this.parentInternalModel,
        this.belongsToRelationship.relationshipMeta,
        options
      );
    }
    if (resource && resource.data) {
      if (resource.data && (resource.data.id || resource.data.clientId)) {
        let internalModel = this.store._internalModelForResource(resource.data);
        if (internalModel.isLoaded()) {
          return internalModel.reload(options).then(internalModel => {
            if (internalModel) {
              return internalModel.getRecord();
            }
            return null;
          });
        } else {
          return this.store._findByInternalModel(internalModel, options);
        }
      }
    }
  }
}
