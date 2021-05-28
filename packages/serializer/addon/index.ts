/**
  ## Overview

  In order to properly manage and present your data, EmberData
  needs to understand the structure of data it receives.

  `Serializers` convert data between the server's API format and
  the format EmberData understands.

  Data received from an API response is **normalized** into
  [JSON:API](https://jsonapi.org/) (the format used internally
  by EmberData), while data sent to an API is **serialized**
  into the format the API expects.

  ### Implementing a Serializer

  There are only two required serializer methods, one for
  normalizing data from the server API format into JSON:API, and
  another for serializing records via `Snapshots` into the expected
  server API format.

  To implement a serializer, export a class that conforms to the structure
  described by the [MinimumSerializerInterface](/ember-data/release/classes/MinimumSerializerInterface)
  from the `app/serializers/` directory. An example is below.

  ```ts
  import EmberObject from '@ember/object';

  export default class ApplicationSerializer extends EmberObject {
    normalizeResponse(store, schema, rawPayload) {
      return rawPayload;
    }

    serialize(snapshot, options) {
      const serializedResource = {
        id: snapshot.id,
        type: snapshot.modelName,
        attributes: snapshot.attributes()
      };

      return serializedResource;
    }
  }
 ```


  ### Serializer Resolution

  `store.serializerFor(name)` will lookup serializers defined in
  `app/serializers/` and return an instance. If no serializer is found, an
  error will be thrown.

  `serializerFor` first attempts to find a serializer with an exact match on `name`,
  then falls back to checking for the presence of a serializer named `application`.

  ```ts
  store.serializerFor('author');

  // lookup paths (in order) =>
  //   app/serializers/author.js
  //   app/serializers/application.js
  ```

  Most requests in EmberData are made with respect to a particular `type` (or `modelName`)
  (e.g., "get me the full collection of **books**" or "get me the **employee** whose id is 37"). We
  refer to this as the **primary** resource `type`.

  Typically `serializerFor` will be used to find a serializer with a name matching that of the primary
  resource `type` for the request, falling back to the `application` serializer for those types that
  do not have a defined serializer. This is often described as a `per-model` or `per-type` strategy
  for defining serializers. However, because APIs rarely format payloads per-type but rather
  per-API-version, this may not be a desired strategy.

  It is recommended that applications define only a single `application` adapter and serializer
  where possible.

  If you have multiple API formats and the per-type strategy is not viable, one strategy is to
  write an `application` adapter and serializer that make use of `options` to specify the desired
  format when making a request.

  ### Using a Serializer

  Any serializer in `app/serializers/` can be looked up by `name` using `store.serializerFor(name)`.

  ### Default Serializers

  For applications whose APIs are *very close to* or *exactly* the **REST** format or **JSON:API**
  format the `@ember-data/serializer` package contains implementations these applications can
  extend. It also contains a simple `JSONSerializer` for serializing to/from very basic JSON objects.

  Many applications will find writing their own serializer to be more performant and less
  complex than extending these classes even when their API format is very close to that expected
  by these serializers.

  It is recommended that apps write their own serializer to best suit the needs of their API and
  application.

  @module @ember-data/serializer
  @main @ember-data/serializer
*/

import EmberObject from '@ember/object';

/**
  `Serializer` is an abstract base class that you should override in your
  application to customize it for your backend. The minimum set of methods
  that you should implement is:

    * `normalizeResponse()`
    * `serialize()`

  And you can optionally override the following methods:

    * `normalize()`

  For an example implementation, see
  [JSONSerializer](JSONSerializer), the included JSON serializer.

  @class Serializer
  @public
  @extends Ember.EmberObject
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
        let modelClass = this.store.modelFor(relationshipModelName);
        let relationshipSerializer = this.store.serializerFor(relationshipModelName);
        return relationshipSerializer.normalize(modelClass, relationshipHash);
      }
    });
    ```

    @property store
    @type {Store}
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
    @public
    @param {Store} store
    @param {Model} primaryModelClass
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
        let json = {
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
    @public
    @param {Snapshot} snapshot
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
        let data = {
          id:            resourceHash.id,
          type:          modelClass.modelName,
          attributes:    resourceHash
        };
        return { data: data };
      }
    })
    ```

    @method normalize
    @public
    @param {Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize(typeClass, hash) {
    return hash;
  },
});
