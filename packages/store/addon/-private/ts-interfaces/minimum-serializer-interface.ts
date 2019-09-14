/**
  ## Overview

  In order to properly manage and present your data, `EmberData`
  needs to understand the structure of data it receives.

  `Serializers` convert data between the format used by an API
  and the format `EmberData` understands.

  Data received from an API response is `"normalized"` into 
  [JSON:API](https://jsonapi.org/) (the format used internally
  by `EmberData`), while data sent to an API is `"serialized"`
  into the format the API expects.

  ### Implementing a Serializer

  There are only two required serializer methods, one for
  normalizing data in `JSON:API`, and another for serializing
  records via `Snapshot`s into the expected API.

  To implement a serializer, export a class implementing the
  [MinimumSerializerInterface](MinimumSerializerInterface) from
  the `app/serializers/` directory. An example is below.

  ```ts
  import EmberObject from '@ember/object';

  export default class ApplicationSerializer extends EmberObject {
    normalizeResponse(_, __, rawPayload) {
      return rawPayload;
    }
    serialize(snapshot, options) {
      const serializedResource = {
        id: snapshot.id(),
        type: snapshot.modelName,
        attributes: snapshot.attributes()
      };

      return serializedResource;
    }
  }
 ```


  #### Serializer Resolution

  How to achieve per-model
  How to achieve per-API
  How to achieve single

  ### Using a Serializer

  ### Default Serializers

  @module @ember-data/serializer
  @main @ember-data/serializer
  @class MinimumSerializerInterface
  @public
*/

import { Object as JSONObject } from 'json-typescript';
import Store from '../system/core-store';
import { JsonApiDocument, SingleResourceDocument } from './ember-data-json-api';
import Snapshot from '../system/snapshot';
import ShimModelClass from '../system/model/shim-model-class';

type OptionsHash = Record<string, any>;

interface Serializer {
  /**
   * This method is responsible for normalizing the value resolved from the promise returned
   * by an Adapter request into the format expected by the `Store`.
   *
   * The output should be a [JSON:API](https://jsonapi.org/) document with the following
   * additional restrictions:
   *
   * - `type` should be formatted in the `singular` `dasherized` `lowercase` form
   * - `members` (the property names of attributes and relationships) should be formatted
   *    to match their definition in the corresponding `Model` definition. Typically this
   *    will be `camelCase`.
   *
   * @method normalizeResponse
   * @param {Store} store - the store service that initiated the request being normalized
   * @param {ShimModelClass} schema - An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {JSONObject} rawPayload - The raw JSON response data returned from an API request.
   *  This correlates to the value the promise returned by the adapter method that performed
   *  the request resolved to.
   * @param {string|null} id - For a `findRecord` request, this is the `id` initially provided
   *  in the call to `store.findRecord`. Else this value is `null`.
   * @param {'findRecord' | 'queryRecord' | 'findAll' | 'findBelongsTo' | 'findHasMany' | 'findMany' | 'query' | 'createRecord' | 'deleteRecord' | 'updateRecord'} requestType - The
   *  type of request the Adapter had been asked to perform.
   *
   * @returns {JsonApiDocument} - a document following the structure of a `JSON:API` Document.
   */
  normalizeResponse(
    store: Store,
    schema: ShimModelClass,
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
   * @param {Snapshot} snapshot - A Snapshot for the record to serialize
   * @param {object} options
   */
  serialize(snapshot: Snapshot, options?: OptionsHash): JSONObject;

  /**
   * This method is intended to normalize data into a `JsonApiDocument` representing
   * with a data member containing a single `resource`.
   *
   * This method is called by the `Store` when `store.normalize(modelName, payload)` is
   * called. It is recommended to use `store.serializerFor(modelName).normalizeResponse`
   * over `store.normalize`.
   *
   * This method may be called when also using the `RESTSerializer`
   * when `serializer.pushPayload` is called by `store.pushPayload`.
   * It is recommended to use `store.push` over `store.pushPayload` after normalizing
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
   * @param {ShimModelClass} schema - An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {JSONObject} rawPayload - Some raw JSON data to be normalized into a `JSON:API` resource.
   * @param {string} [prop] - When called by the `EmbeddedRecordsMixin` this param will be the
   *  property at which the object provided as rawPayload was found.
   * @returns {SingleResourceDocument} - A `JSON:API` document containing a single `resource` as
   * its primary data.
   */
  normalize?(schema: ShimModelClass, rawPayload: JSONObject, prop?: string): SingleResourceDocument;

  /**
   * When using `JSONAPIAdapter` or `RESTAdapter` this method is called
   * by `adapter.updateRecord` and `adapter.createRecord` if `Serializer.serializeIntoHash`
   * is not implemented.
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
   * @param hash - an top most object of the request payload onto
   *  which to append the serialized record
   * @param {ShimModelClass} schema - An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {Snapshot} snapshot - A Snapshot for the record to serialize
   * @param options
   */
  serializeIntoHash?(hash: object, schema: ShimModelClass, snapshot: Snapshot, options?: OptionsHash): void;

  /**
   * This method is called by `store.pushPayload` and should be implemented if
   * you want to use that method.
   *
   * It is recommended to use `store.push` over `store.pushPayload` after normalizing
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
   * @method pushPayload [OPTIONAL]
   * @param {Store} store - the store service that initiated the request being normalized
   * @param {JSONObject} rawPayload - The raw JSON response data returned from an API request.
   *  This JSON should be in the API format expected by the serializer.
   * @returns {JsonApiDocument} - a document following the structure of a `JSON:API` Document.
   */
  pushPayload?(store: Store, rawPayload: JSONObject): JsonApiDocument;
}

export default Serializer;
