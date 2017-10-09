/**
  @module ember-data
*/

import EmberObject from '@ember/object';

/**
  `DS.Serializer` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `normalizeResponse()`
    * `serialize()`

  And you can optionally override the following methods:

    * `normalize()`

  For an example implementation, see
  [DS.JSONSerializer](DS.JSONSerializer.html), the included JSON serializer.

  @class Serializer
  @namespace DS
  @extends Ember.Object
*/

export default EmberObject.extend({

  /**
    The `store` property is the application's `store` that contains
    all records. It can be used to look up serializers for other model
    types that may be nested inside the payload response.

    Example:

    ```js
    Serializer.extend({
      extractRelationship(relationshipModelName, relationshipHash) {
        var modelClass = this.store.modelFor(relationshipModelName);
        var relationshipSerializer = this.store.serializerFor(relationshipModelName);
        return relationshipSerializer.normalize(modelClass, relationshipHash);
      }
    });
    ```

    @property store
    @type {DS.Store}
    @public
  */

  /**
    The `normalizeResponse` method is used to normalize a payload from the
    server to a JSON-API Document.

    http://jsonapi.org/format/#document-structure

    Example:

    ```js
    Serializer.extend({
      normalizeResponse(store, primaryModelClass, payload, id, requestType) {
        if (requestType === 'findRecord') {
          return this.normalize(primaryModelClass, payload);
        } else {
          return payload.reduce(function(documentHash, item) {
            let { data, included } = this.normalize(primaryModelClass, item);
            documentHash.included.push(...included);
            documentHash.data.push(data);
            return documentHash;
          }, { data: [], included: [] })
        }
      }
    });
    ```

    @since 1.13.0
    @method normalizeResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeResponse: null,

  /**
    The `serialize` method is used when a record is saved in order to convert
    the record into the form that your external data source expects.

    `serialize` takes an optional `options` hash with a single option:

    - `includeId`: If this is `true`, `serialize` should include the ID
      in the serialized object it builds.

    Example:

    ```js
    Serializer.extend({
      serialize(snapshot, options) {
        var json = {
          id: snapshot.id
        };

        snapshot.eachAttribute((key, attribute) => {
          json[key] = snapshot.attr(key);
        });

        snapshot.eachRelationship((key, relationship) => {
          if (relationship.kind === 'belongsTo') {
            json[key] = snapshot.belongsTo(key, { id: true });
          } else if (relationship.kind === 'hasMany') {
            json[key] = snapshot.hasMany(key, { ids: true });
          }
        });

        return json;
      },
    });
    ```

    @method serialize
    @param {DS.Snapshot} snapshot
    @param {Object} [options]
    @return {Object}
  */
  serialize: null,

  /**
    The `normalize` method is used to convert a payload received from your
    external data source into the normalized form `store.push()` expects. You
    should override this method, munge the hash and return the normalized
    payload.

    Example:

    ```js
    Serializer.extend({
      normalize(modelClass, resourceHash) {
        var data = {
          id:            resourceHash.id,
          type:          modelClass.modelName,
          attributes:    resourceHash
        };
        return { data: data };
      }
    })
    ```

    @method normalize
    @param {DS.Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize(typeClass, hash) {
    return hash;
  }

});
