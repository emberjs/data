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
  @public
*/

type Dict<T> = import('./utils').Dict<T>;
type ModelSchema = import('./ds-model').ModelSchema;
type Snapshot = import('../system/snapshot').default;
type JsonApiDocument = import('./ember-data-json-api').JsonApiDocument;
type SingleResourceDocument = import('./ember-data-json-api').SingleResourceDocument;
type Store = import('../system/core-store').default;
type JSONObject = import('json-typescript').Object;

type OptionsHash = Dict<any>;

/**
  The following documentation describes the methods an application
  serializer should implement with descriptions around when an
  application might expect these methods to be called.

  Methods that are not required are marked as **optional**.

  @module @ember-data/serializer
  @class MinimumSerializerInterface
  @public
*/
interface Serializer {
  /**
   * This method is responsible for normalizing the value resolved from the promise returned
   * by an Adapter request into the format expected by the `Store`.
   *
   * The output should be a [JSON:API Document](https://jsonapi.org/format/#document-structure)
   * with the following additional restrictions:
   *
   * - `type` should be formatted in the `singular` `dasherized` `lowercase` form
   * - `members` (the property names of attributes and relationships) should be formatted
   *    to match their definition in the corresponding `Model` definition. Typically this
   *    will be `camelCase`.
   * - [`lid`](https://github.com/emberjs/rfcs/blob/master/text/0403-ember-data-identifiers.md) is
   *    a valid optional sibling to `id` and `type` in both [Resources](https://jsonapi.org/format/#document-resource-objects)
   *    and [Resource Identifier Objects](https://jsonapi.org/format/#document-resource-identifier-objects)
   *
   * @method normalizeResponse
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {JSONObject} rawPayload The raw JSON response data returned from an API request.
   *  This correlates to the value the promise returned by the adapter method that performed
   *  the request resolved to.
   * @param {string|null} id For a findRecord request, this is the id initially provided
   *  in the call to store.findRecord. Else this value is null.
   * @param {'findRecord' | 'queryRecord' | 'findAll' | 'findBelongsTo' | 'findHasMany' | 'findMany' | 'query' | 'createRecord' | 'deleteRecord' | 'updateRecord'} requestType The
   *  type of request the Adapter had been asked to perform.
   *
   * @returns {JsonApiDocument} a document following the structure of a JSON:API Document.
   */
  normalizeResponse(
    store: Store,
    schema: ModelSchema,
    rawPayload: JSONObject,
    id: string | null,
    requestType:
      | 'findRecord'
      | 'queryRecord'
      | 'findAll'
      | 'findBelongsTo'
      | 'findHasMany'
      | 'findMany'
      | 'query'
      | 'createRecord'
      | 'deleteRecord'
      | 'updateRecord'
  ): JsonApiDocument;

  /**
   * This method is responsible for serializing an individual record
   * via a [Snapshot](Snapshot) into the format expected by the API.
   *
   * This method is called by `snapshot.serialize()`.
   *
   * When using `Model`, this method is called by `record.serialize()`.
   *
   * When using `JSONAPIAdapter` or `RESTAdapter` this method is called
   * by `updateRecord` and `createRecord` if `Serializer.serializeIntoHash`
   * is not implemented.
   *
   * @method serialize
   * @public
   * @param {Snapshot} snapshot A Snapshot for the record to serialize
   * @param {object} [options]
   */
  serialize(snapshot: Snapshot, options?: OptionsHash): JSONObject;

  /**
   * This method is intended to normalize data into a [JSON:API Document](https://jsonapi.org/format/#document-structure)
   * with a data member containing a single [Resource](https://jsonapi.org/format/#document-resource-objects).
   *
   * - `type` should be formatted in the singular, dasherized and lowercase form
   * - `members` (the property names of attributes and relationships) should be formatted
   *    to match their definition in the corresponding `Model` definition. Typically this
   *    will be `camelCase`.
   * - [`lid`](https://github.com/emberjs/rfcs/blob/master/text/0403-ember-data-identifiers.md) is
   *    a valid optional sibling to `id` and `type` in both [Resources](https://jsonapi.org/format/#document-resource-objects)
   *    and [Resource Identifier Objects](https://jsonapi.org/format/#document-resource-identifier-objects)
   *
   * This method is called by the `Store` when `store.normalize(modelName, payload)` is
   * called. It is recommended to use `store.serializerFor(modelName).normalizeResponse`
   * over `store.normalize`.
   *
   * This method may be called when also using the `RESTSerializer`
   * when `serializer.pushPayload` is called by `store.pushPayload`.
   * However, it is recommended to use `store.push` over `store.pushPayload` after normalizing
   * the payload directly.
   *
   * Example:
   * ```js
   * function pushPayload(store, modelName, rawPayload) {
   *   const ModelClass = store.modelFor(modelName);
   *   const serializer = store.serializerFor(modelName);
   *   const jsonApiPayload = serializer.normalizeResponse(store, ModelClass, rawPayload, null, 'query');
   *
   *   return store.push(jsonApiPayload);
   * }
   * ```
   *
   * This method may be called when also using the `JSONAPISerializer`
   * when normalizing included records. If mixing serializer usage in this way
   * we recommend implementing this method, but caution that it may lead
   * to unexpected mixing of formats.
   *
   * This method may also be called when normalizing embedded relationships when
   * using the `EmbeddedRecordsMixin`. If using this mixin in a serializer in
   * your application we recommend implementing this method, but caution that
   * it may lead to unexpected mixing of formats.
   *
   * @method normalize [OPTIONAL]
   * @public
   * @optional
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {JSONObject} rawPayload Some raw JSON data to be normalized into a JSON:API Resource.
   * @param {string} [prop] When called by the EmbeddedRecordsMixin this param will be the
   *  property at which the object provided as rawPayload was found.
   * @returns {SingleResourceDocument} A JSON:API Document
   *  containing a single JSON:API Resource
   *  as its primary data.
   */
  normalize?(schema: ModelSchema, rawPayload: JSONObject, prop?: string): SingleResourceDocument;

  /**
   * When using `JSONAPIAdapter` or `RESTAdapter` this method is called
   * by `adapter.updateRecord` and `adapter.createRecord` if `serializer.serializeIntoHash`
   * is implemented. If this method is not implemented, `serializer.serialize`
   * will be called in this case.
   *
   * You can use this method to customize the root keys serialized into the payload.
   * The hash property should be modified by reference.
   *
   * For instance, your API may expect resources to be keyed by underscored type in the payload:
   *
   * ```js
   * {
   *   _user: {
   *     type: 'user',
   *     id: '1'
   *   }
   * }
   * ```
   *
   * Which when using these adapters can be achieved by implementing this method similar
   * to the following:
   *
   * ```js
   * serializeIntoHash(hash, ModelClass, snapshot, options) {
   *   hash[`_${snapshot.modelName}`] = this.serialize(snapshot, options).data;
   * }
   * ```
   *
   * @method serializeIntoHash [OPTIONAL]
   * @public
   * @optional
   * @param hash A top most object of the request payload onto
   *  which to append the serialized record
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {Snapshot} snapshot A Snapshot for the record to serialize
   * @param [options]
   * @returns {void}
   */
  serializeIntoHash?(hash: object, schema: ModelSchema, snapshot: Snapshot, options?: OptionsHash): void;

  /**
   * This method allows for normalization of data when `store.pushPayload` is called
   * and should be implemented if you want to use that method.
   *
   * The method is responsible for pushing new data to the store using `store.push`
   * once any necessary normalization has occurred, and no data in the store will be
   * updated unless it does so.
   *
   * The normalized form pushed to the store should be a [JSON:API Document](https://jsonapi.org/format/#document-structure)
   * with the following additional restrictions:
   *
   * - `type` should be formatted in the singular, dasherized and lowercase form
   * - `members` (the property names of attributes and relationships) should be formatted
   *    to match their definition in the corresponding `Model` definition. Typically this
   *    will be `camelCase`.
   * - [`lid`](https://github.com/emberjs/rfcs/blob/master/text/0403-ember-data-identifiers.md) is
   *    a valid optional sibling to `id` and `type` in both [Resources](https://jsonapi.org/format/#document-resource-objects)
   *    and [Resource Identifier Objects](https://jsonapi.org/format/#document-resource-identifier-objects)
   *
   * If you need better control over normalization or want access to the records being added or updated
   * in the store, we recommended using `store.push` over `store.pushPayload` after normalizing
   * the payload directly. This can even take advantage of an existing serializer for the format
   * the data is in, for example:
   *
   * ```js
   * function pushPayload(store, modelName, rawPayload) {
   *   const ModelClass = store.modelFor(modelName);
   *   const serializer = store.serializerFor(modelName);
   *   const jsonApiPayload = serializer.normalizeResponse(store, ModelClass, rawPayload, null, 'query');
   *
   *   return store.push(jsonApiPayload);
   * }
   * ```
   *
   * @method pushPayload [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {JSONObject} rawPayload The raw JSON response data returned from an API request.
   *  This JSON should be in the API format expected by the serializer.
   * @returns {void}
   */
  pushPayload?(store: Store, rawPayload: JSONObject): void;
}

export default Serializer;
