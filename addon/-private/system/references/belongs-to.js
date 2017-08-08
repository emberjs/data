import Model from '../model/model';
import Ember from 'ember';
import Reference from './reference';

import isEnabled from '../../features';
import { deprecate } from '@ember/debug';
import { assertPolymorphicType } from 'ember-data/-debug';

/**
   A BelongsToReference is a low level API that allows users and
   addon author to perform meta-operations on a belongs-to
   relationship.

   @class BelongsToReference
   @namespace DS
   @extends DS.Reference
*/
const BelongsToReference = function(store, parentInternalModel, belongsToRelationship) {
  this._super$constructor(store, parentInternalModel);
  this.belongsToRelationship = belongsToRelationship;
  this.type = belongsToRelationship.relationshipMeta.type;
  this.parent = parentInternalModel.recordReference;

  // TODO inverse
};

BelongsToReference.prototype = Object.create(Reference.prototype);
BelongsToReference.prototype.constructor = BelongsToReference;
BelongsToReference.prototype._super$constructor = Reference;

/**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

    let blog = store.push({
      type: 'blog',
      id: 1,
      relationships: {
        user: {
          data: { type: 'user', id: 1 }
        }
      }
    });
    let userRef = blog.belongsTo('user');

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
      let id = userRef.id();
    } else if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }
    ```

   @method remoteType
   @return {String} The name of the remote type. This should either be "link" or "id"
*/
BelongsToReference.prototype.remoteType = function() {
  if (this.belongsToRelationship.link) {
    return "link";
  }

  return "id";
};

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
BelongsToReference.prototype.id = function() {
  let inverseInternalModel = this.belongsToRelationship.inverseInternalModel;
  return inverseInternalModel && inverseInternalModel.id;
};

/**
   The link Ember Data will use to fetch or reload this belongs-to
   relationship.

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
            links: {
              related: '/articles/1/author'
            }
          }
        }
      }
    });
    let userRef = blog.belongsTo('user');

    // get the identifier of the reference
    if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }
    ```

   @method link
   @return {String} The link Ember Data will use to fetch or reload this belongs-to relationship.
*/
BelongsToReference.prototype.link = function() {
  return this.belongsToRelationship.link;
};

/**
   The meta data for the belongs-to relationship.

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
            links: {
              related: {
                href: '/articles/1/author',
                meta: {
                  lastUpdated: 1458014400000
                }
              }
            }
          }
        }
      }
    });

    let userRef = blog.belongsTo('user');

    userRef.meta() // { lastUpdated: 1458014400000 }
    ```

   @method meta
   @return {Object} The meta information for the belongs-to relationship.
*/
BelongsToReference.prototype.meta = function() {
  return this.belongsToRelationship.meta;
};

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
BelongsToReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((data) => {
    let record;

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

    this.belongsToRelationship.setCanonicalInternalModel(record._internalModel);

    return record;
  });
};

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
   @param {Object|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {DS.Model} the record in this relationship
*/
BelongsToReference.prototype.value = function() {
  let inverseInternalModel = this.belongsToRelationship.inverseInternalModel;

  if (inverseInternalModel && inverseInternalModel.isLoaded()) {
    return inverseInternalModel.getRecord();
  }

  return null;
};

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

   @method load
   @return {Promise} a promise that resolves with the record in this belongs-to relationship.
*/
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

   @method reload
   @return {Promise} a promise that resolves with the record in this belongs-to relationship after the reload has completed.
*/
BelongsToReference.prototype.reload = function() {
  return this.belongsToRelationship.reload().then((internalModel) => {
    return this.value();
  });
};

export default BelongsToReference;
