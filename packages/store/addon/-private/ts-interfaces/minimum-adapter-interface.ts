type Dict<T> = import('./utils').Dict<T>;
type Snapshot = import('../system/snapshot').default;
type SnapshotRecordArray = import('../system/snapshot-record-array').default;
type Store = import('../system/core-store').default;
type ModelSchema = import('../ts-interfaces/ds-model').ModelSchema;
type AdapterPopulatedRecordArray = import('../system/record-arrays/adapter-populated-record-array').default;
type RelationshipSchema = import('./record-data-schemas').RelationshipSchema;

type Group = Snapshot[];

/**
  ## Overview

  In order to properly fetch and update data, EmberData
  needs to understand how to connect to your API.

  `Adapters` accept various kinds of requests from the store
  and manage fulfillment of the request from your API.

  ### Request Flow

  When the store decides it needs to issue a request it uses the
  following flow to manage the request and process the data.

  - find the appropriate adapter
  - issue the request to the adapter
  - await the adapter's response
    - if an error occurs reject with the error
    - if no error
      - if there is response data
        - pass the response data to the appropriate serializer
        - update the cache using the JSON:API formatted data from the serializer's response
      - return the primary record(s) associated with the request

  ### Request Errors

  When a request errors and your adapter does not have the ability to recover from the error,
  you may either reject the promise returned by your adapter method with the error or simply
  throw the error.

  If the request was for a `createRecord` `updateRecord` or `deleteRecord` special rules
  apply to how this error will affect the state of the store and additional properties on
  the `Error` class may be used. See the documentation for these methods in the
  `MinimumAdapterInterface` for more information.

  ### Implementing an Adapter

  There are seven required adapter methods, one for each of
  the primary request types that EmberData issues.

  They are:

  - findRecord
  - findAll
  - queryRecord
  - query
  - createRecord
  - updateRecord
  - deleteRecord

  Each of these request types has a matching store method that triggers it
  and matching `requestType` that is passed to the serializer's
  `normalizeResponse` method.

  If your app only reads data but never writes data, it is not necessary
  to implement the methods for create, update, and delete. This extends to
  all of the store's find methods with the exception of `findRecord` (`findAll`,
  `query`, `queryRecord`): if you do not use the store method in your app then
  your Adapter does not need the method.

  ```ts
  import EmberObject from '@ember/object';

  async function fetchData(url, options = {}) {
    let response = await fetch(`./${modelName}s/${id}`, options);
    return response.toJSON();
  }

  export default class ApplicationAdapter extends EmberObject {
    findRecord(_, { modelName }, id) {
      return fetchData(`./${modelName}s/${id}`);
    }
  }
  ```

  ### Adapter Resolution

  `store.adapterFor(name)` will lookup adapters defined in `app/adapters/` and
  return an instance.

  `adapterFor` first attempts to find an adapter with an exact match on `name`,
  then falls back to checking for the presence of an adapter named `application`.

  If no adapter is found, an error will be thrown.

  ```ts
  store.adapterFor('author');

  // lookup paths (in order) =>
  //   app/adapters/author.js
  //   app/adapters/application.js
  ```

  Most requests in EmberData are made with respect to a particular `type` (or `modelName`)
  (e.g., "get me the full collection of **books**" or "get me the **employee** whose id is 37"). We
  refer to this as the **primary** resource `type`.

  `adapterFor` is used by the store to find an adapter with a name matching that of the primary
  resource `type` for the request, which then falls back to the `application` adapter.

  It is recommended that applications define only a single `application` adapter and serializer
  where possible, only implementing an adapter specific to the `type` when absolutely necessary.

  If you need to support multiple API versions for the same type, the per-type strategy for
  defining adapters might not be adequate.

  If you have multiple APIs or multiple API versions and the single application adapter and per-type
  strategy does not suite your needs, one strategy is to write an `application` adapter and serializer
  that make use of `options` to specify the desired format when making a request, then forwards to the
  request to the desired adapter or serializer as needed.

  ```app/adapters/application.js
  export default class Adapter extends EmberObject {
    findRecord(store, schema, id, snapshot) {
      let { apiVersion } = snapshot.adapterOptions;
      return this.adapterFor(`-api-${apiVersion}`).findRecord(store, schema, id, snapshot);
    }
  }
  ```

  ### Using an Adapter

  Any adapter in `app/adapters/` can be looked up by `name` using `store.adapterFor(name)`.

  ### Default Adapters

  Applications whose API's structure endpoint URLs *very close to* or *exactly* the **REST**
  or **JSON:API** convention, the `@ember-data/adapter` package contains implementations
  these applications can extend.

  Many applications will find writing their own adapter to be allow greater flexibility,
  customization, and maintenance than attempting to override methods in these adapters.

  @module @ember-data/adapter
  @main @ember-data/adapter
  @public
*/

/**
  The following documentation describes the methods an
  adapter should implement with descriptions around when an
  application might expect these methods to be called.

  Methods that are not required are marked as **optional**.

  @module @ember-data/adapter
  @class MinimumAdapterInterface
  @public
*/
interface Adapter {
  /**
   * `adapter.findRecord` takes a request for a resource of a given `type` and `id` combination
   * and should return a `Promise` which fulfills with data for a single resource matching that
   * `type` and `id`.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method with the
   * `requestType` set to `findRecord`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data for the record.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * `adapter.findRecord` is called whenever the `store` needs to load, reload, or backgroundReload
   * the resource data for a given `type` and `id`.
   *
   * @method findRecord
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {String} id
   * @param {Snapshot} snapshot
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  findRecord(store: Store, schema: ModelSchema, id: string, snapshot: Snapshot): Promise<unknown>;

  /**
   * `adapter.findAll` takes a request for resources of a given `type` and should return
   *  a `Promise` which fulfills with a collection of resource data matching that `type`.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `findAll`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing records for `type`. Existing records for the `type` will not be removed.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * `adapter.findAll` is called whenever `store.findAll` is asked to reload or backgroundReload.
   * The records in the response are merged with the contents of the store. Existing records for
   * the `type` will not be removed.
   *
   * See also `shouldReloadAll` and `shouldBackgroundReloadAll`
   *
   * @method findAll
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {null} sinceToken This parameter is no longer used and will always be null.
   * @param {SnapshotRecordArray} snapshotRecordArray an object containing any passed in options,
   *  adapterOptions, and the ability to access a snapshot for each existing record of the type.
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  findAll(
    store: Store,
    schema: ModelSchema,
    sinceToken: null,
    snapshotRecordArray: SnapshotRecordArray
  ): Promise<unknown>;

  /**
   * `adapter.query` takes a request for resources of a given `type` and should return
   *  a `Promise` which fulfills with a collection of resource data matching that `type`.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `query`, which should return a `JSON:API` document.
   *
   * As with `findAll`, the final result after normalization to `JSON:API` will be added to
   * store via `store.push` where it will merge with any existing records for `type`.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * `adapter.query` is called whenever `store.query` is called or a previous query result is
   * asked to reload.
   *
   * Existing records for the `type` will not be removed. The key difference is in the result
   * returned by the `store`. For `findAll` the result is all known records of the `type`,
   * while for `query` it will only be the records returned from `adapter.query`.
   *
   * @method query
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {object} query
   * @param {AdapterPopulatedRecordArray} recordArray
   * @param {object} options
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  query(
    store: Store,
    schema: ModelSchema,
    query: Dict<any>,
    recordArray: AdapterPopulatedRecordArray,
    options: { adapterOptions?: unknown }
  ): Promise<unknown>;

  /**
   * `adapter.queryRecord` takes a request for resource of a given `type` and should return
   *  a `Promise` which fulfills with data for a single resource matching that `type`.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `queryRecord`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data for the returned record.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * @method queryRecord
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param query
   * @param options
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  queryRecord(
    store: Store,
    schema: ModelSchema,
    query: Dict<any>,
    options: { adapterOptions?: unknown }
  ): Promise<unknown>;

  /**
   * `adapter.createRecord` takes a request to create a resource of a given `type` and should
   * return a `Promise` which fulfills with data for the newly created resource.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `createRecord`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data for the record.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * If the adapter rejects or throws an error the record will enter an error state and the attributes
   * that had attempted to be saved will still be considered dirty.
   *
   * ### InvalidErrors
   *
   * When rejecting a `createRecord` request due to validation issues during save (typically a 422 status code),
   * you may throw an `InvalidError`.
   *
   * Throwing an `InvalidError` makes per-attribute errors available for records to use in the UI as needed.
   * Records can also use this information to mark themselves as being in an `invalid` state.
   * For more reading [see the RecordData Errors RFC](https://emberjs.github.io/rfcs/0465-record-data-errors.html)
   *
   * ```js
   * let error = new Error(errorMessage);
   *
   * // these two properties combined
   * // alert EmberData to this error being for
   * // invalid properties on the record during
   * // the request
   * error.isAdapterError = true;
   * error.code = 'InvalidError';
   *
   * // A JSON:API formatted array of errors
   * // See https://jsonapi.org/format/#errors
   * error.errors = [];
   *
   * throw error;
   * ```
   *
   * @method createRecord
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {Snapshot} snapshot
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  createRecord(store: Store, schema: ModelSchema, snapshot: Snapshot): Promise<unknown>;

  /**
   * `adapter.updateRecord` takes a request to update a resource of a given `type` and should
   * return a `Promise` which fulfills with the updated data for the resource.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `updateRecord`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data for the record.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * If the adapter rejects or throws an error the record will enter an error state and the attributes
   * that had attempted to be saved will still be considered dirty.
   *
   * ### InvalidErrors
   *
   * When rejecting a `createRecord` request due to validation issues during save (typically a 422 status code),
   * you may throw an `InvalidError`.
   *
   * Throwing an `InvalidError` makes per-attribute errors available for records to use in the UI as needed.
   * Records can also use this information to mark themselves as being in an `invalid` state.
   * For more reading [see the RecordData Errors RFC](https://emberjs.github.io/rfcs/0465-record-data-errors.html)
   *
   * ```js
   * let error = new Error(errorMessage);
   *
   * // these two properties combined
   * // alert EmberData to this error being for
   * // invalid properties on the record during
   * // the request
   * error.isAdapterError = true;
   * error.code = 'InvalidError';
   *
   * // A JSON:API formatted array of errors
   * // See https://jsonapi.org/format/#errors
   * error.errors = [];
   *
   * throw error;
   * ```
   *
   * @method updateRecord
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {Snapshot} snapshot
   */
  updateRecord(store: Store, schema: ModelSchema, snapshot: Snapshot): Promise<unknown>;

  /**
   * `adapter.deleteRecord` takes a request to delete a resource of a given `type` and
   * should return a `Promise` which resolves when that deletion is complete.
   *
   * Usually the response will be empty, but you may include additional updates in the
   * response. The response will be fed to the associated serializer's `normalizeResponse` method
   * with the `requestType` set to `deleteRecord`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * If the adapter rejects or errors the record will need to be saved again once the reason
   * for the error is addressed in order to persist the deleted state.
   *
   * @method deleteRecord
   * @public
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {Snapshot} snapshot A Snapshot containing the record's current data
   * @return
   */
  deleteRecord(store: Store, schema: ModelSchema, snapshot: Snapshot): Promise<unknown>;

  /**
   * `adapter.findBelongsTo` takes a request to fetch a related resource located at a
   * `relatedLink` and should return a `Promise` which fulfills with data for a single
   *  resource.
   *
   * ⚠️ This method is only called if the store previously received relationship information for a resource
   * containing a [related link](https://jsonapi.org/format/#document-resource-object-related-resource-links).
   *
   * If the cache does not have a `link` for the relationship then `findRecord` will be used if a `type` and `id`
   * for the related resource is known.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `findBelongsTo`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * @method findBelongsTo [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {Snapshot} snapshot A Snapshot containing the parent record's current data
   * @param {string} relatedLink The link at which the associated resource might be found
   * @param {RelationshipSchema} relationship
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  findBelongsTo?(
    store: Store,
    snapshot: Snapshot,
    relatedLink: string,
    relationship: RelationshipSchema
  ): Promise<unknown>;

  /**
   * `adapter.findHasMany` takes a request to fetch a related resource collection located
   *  at a `relatedLink` and should return a `Promise` which fulfills with data for that
   *  collection.
   *
   * ⚠️ This method is only called if the store previously received relationship information for a resource
   * containing a [related link](https://jsonapi.org/format/#document-resource-object-related-resource-links).
   *
   * If the cache does not have a `link` for the relationship but the `type` and `id` of
   * related resources are known then `findRecord` will be used for each individual related
   * resource.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `findHasMany`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * @method findhasMany [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {Snapshot} snapshot A Snapshot containing the parent record's current data
   * @param {string} relatedLink The link at which the associated resource collection might be found
   * @param {RelationshipSchema} relationship
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  findHasMany?(
    store: Store,
    snapshot: Snapshot,
    relatedLink: string,
    relationship: RelationshipSchema
  ): Promise<unknown>;

  /**
   * ⚠️ This Method is only called if `coalesceFindRequests` is `true`. The array passed to it is determined
   * by the adapter's `groupRecordsForFindMany` method, and will be called once per group returned.
   *
   * `adapter.findMany` takes a request to fetch a collection of resources and should return a
   * `Promise` which fulfills with data for that collection.
   *
   * The response will be fed to the associated serializer's `normalizeResponse` method
   *  with the `requestType` set to `findMany`, which should return a `JSON:API` document.
   *
   * The final result after normalization to `JSON:API` will be added to store via `store.push` where
   * it will merge with any existing data.
   *
   * ⚠️ If the adapter's response resolves to a false-y value, the associated `serializer.normalizeResponse`
   * call will NOT be made. In this scenario you may need to do at least a minimum amount of response
   * processing within the adapter.
   *
   * See also `groupRecordsForFindMany` and `coalesceFindRequests`
   *
   * @method findMany [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {ModelSchema} schema An object with methods for accessing information about
   *  the type, attributes and relationships of the primary type associated with the request.
   * @param {Array<string>} ids An array of the ids of the resources to fetch
   * @param {Array<Snapshot>} snapshots An array of snapshots of the available data for the resources to fetch
   * @return {Promise} a promise resolving with resource data to feed to the associated serializer
   */
  findMany?(store: Store, schema: ModelSchema, ids: string[], snapshots: Snapshot[]): Promise<unknown>;

  /**
   * This method provides the ability to generate an ID to assign to a new record whenever `store.createRecord`
   * is called if no `id` was provided.
   *
   * Alternatively you can pass an id into the call to `store.createRecord` directly.
   *
   * ```js
   * let id = generateNewId(type);
   * let newRecord = store.createRecord(type, { id });
   * ```
   *
   * @method generateIdForRecord [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {String} type The type (or modelName) of record being created
   * @param properties the properties passed as the second arg to `store.createRecord`
   * @return {String} a string ID that should be unique (no other models of `type` in the cache should have this `id`)
   */
  generateIdForRecord?(store: Store, type: string, properties: unknown): string;

  /**
   * If your adapter implements `findMany`, setting this to `true` will cause `findRecord`
   * requests triggered within the same `runloop` to be coalesced into one or more calls
   * to `adapter.findMany`. The number of calls made and the records contained in each call
   * can be tuned by your adapter's `groupRecordsForHasMany` method.
   *
   * Implementing coalescing using this flag and the associated methods does not always offer
   * the right level of correctness, timing control or granularity. If your application would
   * be better suited coalescing across multiple types, coalescing for longer than a single runloop,
   * or with a more custom request structure, coalescing within your application adapter may prove
   * more effective.
   *
   * @property coalesceFindRequests [OPTIONAL]
   * @public
   * @optional
   * @type {boolean} true if the requests to find individual records should be coalesced, false otherwise
   */
  coalesceFindRequests?: boolean;

  /**
   * ⚠️ This Method is only called if `coalesceFindRequests` is `true`.
   *
   * This method allows for you to split pending requests for records into multiple `findMany`
   * requests. It receives an array of snapshots where each snapshot represents a unique record
   * requested via `store.findRecord` during the most recent `runloop` that was not found in the
   * cache or needs to be reloaded. It should return an array of groups.
   *
   * A group is an array of snapshots meant to be fetched together by a single `findMany` request.
   *
   * By default if this method is not implemented EmberData will call `findMany` once with all
   * requested records as a single group when `coalesceFindRequests` is `true`.
   *
   * See also `findMany` and `coalesceFindRequests`
   *
   * @method groupRecordsForFindMany [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {Array<Snapshot>} snapshots An array of snapshots
   * @return {Array<Array<Snapshot>>} An array of Snapshot arrays
   */
  groupRecordsForFindMany?(store: Store, snapshots: Snapshot[]): Group[];

  /**
   * When a record is already available in the store and is requested again via `store.findRecord`,
   * and `reload` is not specified as an option in the request, this method is called to determine
   * whether the record should be reloaded prior to returning the result.
   *
   * If `reload` is specified as an option in the request (`true` or `false`) this method will not
   * be called.
   *
   * ```js
   * store.findRecord('user', '1', { reload: false })
   * ```
   *
   * The default behavior if this method is not implemented and the option is not specified is to
   * not reload, the same as a return of `false`.
   *
   * See also the documentation for `shouldBackgroundReloadRecord` which defaults to `true`.
   *
   * @method shouldReloadRecord [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {Snapshot} snapshot A Snapshot containing the record's current data
   * @return {boolean} true if the record should be reloaded immediately, false otherwise
   */
  shouldReloadRecord?(store: Store, snapshot: Snapshot): boolean;

  /**
   * When `store.findAll(<type>)` is called without a `reload` option, the adapter
   * is presented the opportunity to trigger a new request for records of that type.
   *
   * If `reload` is specified as an option in the request (`true` or `false`) this method will not
   * be called.
   *
   * ```js
   * store.findAll('user', { reload: false })
   * ```
   *
   * The default behavior if this method is not implemented and the option is not specified is to
   * not reload, the same as a return of `false`.
   *
   * Note: the Promise returned by `store.findAll` resolves to the same RecordArray instance
   * returned by `store.peekAll` for that type, and will include all records in the store for
   * the given type, including any previously existing records not returned by the reload request.
   *
   * @method shouldReloadAll [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {SnapshotRecordArray} snapshotArray
   * @return {boolean} true if the a new request for all records of the type in SnapshotRecordArray should be made immediately, false otherwise
   */
  shouldReloadAll?(store: Store, snapshotArray: SnapshotRecordArray): boolean;

  /**
   * When a record is already available in the store and is requested again via `store.findRecord`,
   * and the record does not need to be reloaded prior to return, this method provides the ability
   * to specify whether a refresh of the data for the reload should be scheduled to occur in the background.
   *
   * Users may explicitly declare a record should/should not be background reloaded by passing
   * `backgroundReload: true` or `backgroundReload: false` as an option to the request respectively.
   *
   * ```js
   * store.findRecord('user', '1', { backgroundReload: false })
   * ```
   *
   * If the `backgroundReload` option is not present, this method will be called to determine whether
   * a backgroundReload should be performed.
   *
   * The default behavior if this method is not implemented and the option was not specified is to
   * background reload, the same as a return of `true`.
   *
   * @method shouldBackgroundReloadRecord [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {Snapshot} snapshot A Snapshot containing the record's current data
   * @return {boolean} true if the record should be reloaded in the background, false otherwise
   */
  shouldBackgroundReloadRecord?(store: Store, snapshot: Snapshot): boolean;

  /**
   * When `store.findAll(<type>)` is called and a `reload` is not initiated, the adapter
   * is presented the opportunity to trigger a new non-blocking (background) request for
   * records of that type
   *
   * Users may explicitly declare that this background request should/should not occur by passing
   * `backgroundReload: true` or `backgroundReload: false` as an option to the request respectively.
   *
   * ```js
   * store.findAll('user', { backgroundReload: false })
   * ```
   *
   * The default behavior if this method is not implemented and the option is not specified is to
   * perform a reload, the same as a return of `true`.
   *
   * @method shouldBackgroundReloadAll [OPTIONAL]
   * @public
   * @optional
   * @param {Store} store The store service that initiated the request being normalized
   * @param {SnapshotRecordArray} snapshotArray
   * @return {boolean} true if the a new request for all records of the type in SnapshotRecordArray should be made in the background, false otherwise
   */
  shouldBackgroundReloadAll?(store: Store, snapshotArray: SnapshotRecordArray): boolean;

  /**
   * In some situations the adapter may need to perform cleanup when destroyed,
   * that cleanup can be done in `destroy`.
   *
   * If not implemented, the store does not inform the adapter of destruction.
   *
   * @method destroy [OPTIONAL]
   * @public
   * @optional
   */
  destroy?(): void;
}

export default Adapter;
