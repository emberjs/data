/**
  @module @ember-data/store
 */
import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import EmberObject from '@ember/object';
import { _backburner as emberBackburner } from '@ember/runloop';

import { LOG_PAYLOADS, LOG_REQUESTS } from '@ember-data/debugging';
import { DEBUG, TESTING } from '@ember-data/env';
import type { Graph } from '@ember-data/graph/-private/graph/graph';
import type { FetchManager } from '@ember-data/legacy-compat/-private';
import type RequestManager from '@ember-data/request';
import type { Future } from '@ember-data/request/-private/types';
import { StableDocumentIdentifier } from '@ember-data/types/cache/identifier';
import type { Cache, CacheV1 } from '@ember-data/types/q/cache';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { ModelSchema } from '@ember-data/types/q/ds-model';
import type {
  CollectionResourceDocument,
  EmptyResourceDocument,
  JsonApiDocument,
  ResourceIdentifierObject,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { MinimumAdapterInterface } from '@ember-data/types/q/minimum-adapter-interface';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { SchemaService } from '@ember-data/types/q/schema-service';
import type { FindOptions } from '@ember-data/types/q/store';

import {
  EnableHydration,
  type LifetimesService,
  SkipCache,
  StoreRequestContext,
  type StoreRequestInput,
} from './cache-handler';
import { IdentifierCache } from './caches/identifier-cache';
import {
  InstanceCache,
  peekRecordIdentifier,
  preloadData,
  recordIdentifierFor,
  resourceIsFullyDeleted,
  storeFor,
} from './caches/instance-cache';
import { Document } from './document';
import type RecordReference from './legacy-model-support/record-reference';
import { getShimClass } from './legacy-model-support/shim-model-class';
import { CacheManager } from './managers/cache-manager';
import NotificationManager from './managers/notification-manager';
import RecordArrayManager from './managers/record-array-manager';
import RequestStateService, { RequestPromise } from './network/request-cache';
import IdentifierArray, { Collection } from './record-arrays/identifier-array';
import coerceId, { ensureStringId } from './utils/coerce-id';
import constructResource from './utils/construct-resource';
import normalizeModelName from './utils/normalize-model-name';

export { storeFor };

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface CreateRecordProperties {
  id?: string | null;
  [key: string]: unknown;
}

/**
 * A Store coordinates interaction between your application, a [Cache](https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Cache),
 * and sources of data (such as your API or a local persistence layer)
 * accessed via a [RequestManager](https://github.com/emberjs/data/tree/main/packages/request).
 *
 * ```app/services/store.js
 * import Store from '@ember-data/store';
 *
 * export default class extends Store {}
 * ```
 *
 * Most Ember applications will only have a single `Store` configured as a Service
 * in this manner. However, setting up multiple stores is possible, including using
 * each as a unique service.
 *

  @class Store
  @public
*/

// @ts-expect-error
interface Store {
  createRecordDataFor?(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper): Cache | CacheV1;

  createCache(storeWrapper: CacheStoreWrapper): Cache;

  instantiateRecord(identifier: StableRecordIdentifier, createRecordArgs: { [key: string]: unknown }): RecordInstance;

  teardownRecord(record: RecordInstance): void;
}

class Store extends EmberObject {
  declare recordArrayManager: RecordArrayManager;

  /**
   * Provides access to the NotificationManager associated
   * with this Store instance.
   *
   * The NotificationManager can be used to subscribe to
   * changes to the cache.
   *
   * @property {NotificationManager} notifications
   * @public
   */
  declare notifications: NotificationManager;

  /**
   * Provides access to the SchemaService instance
   * for this Store instance.
   *
   * The SchemaService can be used to query for
   * information about the schema of a resource.
   *
   * @property {SchemaService} schema
   * @public
   */
  get schema(): SchemaService {
    return this.getSchemaDefinitionService();
  }
  declare _schema: SchemaService;

  /**
   * Provides access to the IdentifierCache instance
   * for this store.
   *
   * The IdentifierCache can be used to generate or
   * retrieve a stable unique identifier for any resource.
   *
   * @property {IdentifierCache} identifierCache
   * @public
   */
  declare identifierCache: IdentifierCache;
  /**
   * Provides access to the requestManager instance associated
   * with this Store instance.
   *
   * When using `ember-data` this property is automatically
   * set to an instance of `RequestManager`. When not using `ember-data`
   * you must configure this property yourself, either by declaring
   * it as a service or by initializing it.
   *
   * ```ts
   * import Store, { CacheHandler } from '@ember-data/store';
   * import RequestManager from '@ember-data/request';
   * import Fetch from '@ember/data/request/fetch';
   *
   * class extends Store {
   *   constructor() {
   *     super(...arguments);
   *     this.requestManager = new RequestManager();
   *     this.requestManager.use([Fetch]);
   *     this.requestManager.useCache(CacheHandler);
   *   }
   * }
   * ```
   *
   * @public
   * @property {RequestManager} requestManager
   */
  declare requestManager: RequestManager;

  /**
   * A Property which an App may set to provide a Lifetimes Service
   * to control when a cached request becomes stale.
   *
   * Note, when defined, these methods will only be invoked if a
   * cache key exists for the request, either because the request
   * contains `cacheOptions.key` or because the [IdentifierCache](/ember-data/release/classes/IdentifierCache)
   * was able to generate a key for the request using the configured
   * [generation method](/ember-data/release/functions/@ember-data%2Fstore/setIdentifierGenerationMethod).
   *
   * `isSoftExpired` will only be invoked if `isHardExpired` returns `false`.
   *
   * ```ts
   * store.lifetimes = {
   *   // make the request and ignore the current cache state
   *   isHardExpired(identifier: StableDocumentIdentifier): boolean {
   *     return false;
   *   }
   *
   *   // make the request in the background if true, return cache state
   *   isSoftExpired(identifier: StableDocumentIdentifier): boolean {
   *     return false;
   *   }
   * }
   * ```
   *
   * @public
   * @property {LivetimesService|undefined} lifetimes
   */
  declare lifetimes?: LifetimesService;

  // Private
  declare _graph?: Graph;
  declare _fetchManager: FetchManager;
  declare _adapterCache: Record<string, MinimumAdapterInterface & { store: Store }>;
  declare _serializerCache: Record<string, MinimumSerializerInterface & { store: Store }>;
  declare _requestCache: RequestStateService;
  declare _instanceCache: InstanceCache;
  declare _documentCache: Map<StableDocumentIdentifier, Document<RecordInstance | RecordInstance[] | null | undefined>>;

  declare _cbs: { coalesce?: () => void; sync?: () => void; notify?: () => void } | null;
  declare _forceShim: boolean;
  declare _enableAsyncFlush: boolean | null;

  // DEBUG-only properties
  declare DISABLE_WAITER?: boolean;

  declare _isDestroying: boolean;
  declare _isDestroyed: boolean;

  get isDestroying(): boolean {
    return this._isDestroying;
  }
  set isDestroying(value: boolean) {
    this._isDestroying = value;
  }
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }
  set isDestroyed(value: boolean) {
    this._isDestroyed = value;
  }

  /**
    @method init
    @private
  */
  constructor(createArgs?: Record<string, unknown>) {
    // @ts-expect-error ember-source types improperly expect createArgs to be `Owner`
    super(createArgs);
    Object.assign(this, createArgs);

    this.identifierCache = new IdentifierCache();

    this.notifications = new NotificationManager(this);

    // private but maybe useful to be here, somewhat intimate
    this.recordArrayManager = new RecordArrayManager({ store: this });

    // private
    this._requestCache = new RequestStateService(this);
    this._instanceCache = new InstanceCache(this);
    this._adapterCache = Object.create(null);
    this._serializerCache = Object.create(null);
    this._documentCache = new Map();

    this.isDestroying = false;
    this.isDestroyed = false;
  }

  _run(cb: () => void) {
    assert(`EmberData should never encounter a nested run`, !this._cbs);
    const _cbs: { coalesce?: () => void; sync?: () => void; notify?: () => void } = (this._cbs = {});
    cb();
    if (_cbs.coalesce) {
      _cbs.coalesce();
    }
    if (_cbs.sync) {
      _cbs.sync();
    }
    if (_cbs.notify) {
      _cbs.notify();
    }
    this._cbs = null;
  }
  _join(cb: () => void): void {
    if (this._cbs) {
      cb();
    } else {
      this._run(cb);
    }
  }

  _schedule(name: 'coalesce' | 'sync' | 'notify', cb: () => void): void {
    assert(`EmberData expects to schedule only when there is an active run`, !!this._cbs);
    assert(`EmberData expects only one flush per queue name, cannot schedule ${name}`, !this._cbs[name]);

    this._cbs[name] = cb;
  }

  /**
   * Retrieve the RequestStateService instance
   * associated with this Store.
   *
   * This can be used to query the status of requests
   * that have been initiated for a given identifier.
   *
   * @method getRequestStateService
   * @returns {RequestStateService}
   * @public
   */
  getRequestStateService(): RequestStateService {
    return this._requestCache;
  }

  _getAllPending(): (Promise<unknown[]> & { length: number }) | void {
    if (TESTING) {
      const all: Promise<any>[] = [];
      const pending = this._requestCache._pending;
      const lids = Object.keys(pending);
      lids.forEach((lid) => {
        all.push(...pending[lid].map((v) => v[RequestPromise]!));
      });
      this.requestManager._pending.forEach((v) => all.push(v));
      const promise: Promise<unknown[]> & { length: number } = Promise.allSettled(all) as Promise<unknown[]> & {
        length: number;
      };
      promise.length = all.length;
      return promise;
    }
  }

  /**
   * Issue a request via the configured RequestManager,
   * inserting the response into the cache and handing
   * back a Future which resolves to a ResponseDocument
   *
   * Resource data is always updated in the cache.
   *
   * Only GET requests have the request result and document
   * cached by default when a cache key is present.
   *
   * The cache key used is `requestConfig.cacheOptions.key`
   * if present, falling back to `requestconfig.url`.
   *
   * Params are not serialized as part of the cache-key, so
   * either ensure they are already in the url or utilize
   * `requestConfig.cacheOptions.key`. For queries issued
   * via the `POST` method `requestConfig.cacheOptions.key`
   * MUST be supplied for the document to be cached.
   *
   * @method request
   * @param {StoreRequestInput} requestConfig
   * @returns {Future}
   * @public
   */
  request<T>(requestConfig: StoreRequestInput): Future<T> {
    // we lazily set the cache handler when we issue the first request
    // because constructor doesn't allow for this to run after
    // the user has had the chance to set the prop.
    let opts: {
      store: Store;
      disableTestWaiter?: boolean;
      [EnableHydration]: true;
      records?: StableRecordIdentifier[];
    } = {
      store: this,
      [EnableHydration]: true,
    };

    if (requestConfig.records) {
      const identifierCache = this.identifierCache;
      opts.records = requestConfig.records.map((r) => identifierCache.getOrCreateRecordIdentifier(r));
    }

    if (TESTING) {
      if (this.DISABLE_WAITER) {
        opts.disableTestWaiter =
          typeof requestConfig.disableTestWaiter === 'boolean' ? requestConfig.disableTestWaiter : true;
      }
    }

    if (LOG_REQUESTS) {
      let options: unknown;
      try {
        options = JSON.parse(JSON.stringify(requestConfig));
      } catch {
        options = requestConfig;
      }
      // eslint-disable-next-line no-console
      console.log(
        `request: [[START]] ${requestConfig.op && !requestConfig.url ? '(LEGACY) ' : ''}${
          requestConfig.op || '<unknown operation>'
        } ${requestConfig.url || '<empty url>'}  ${requestConfig.method || '<empty method>'}`,
        options
      );
    }

    const future = this.requestManager.request<T>(Object.assign(requestConfig, opts));

    future.onFinalize(() => {
      if (LOG_REQUESTS) {
        // eslint-disable-next-line no-console
        console.log(
          `request: [[FINALIZE]] ${requestConfig.op && !requestConfig.url ? '(LEGACY) ' : ''}${
            requestConfig.op || '<unknown operation>'
          } ${requestConfig.url || '<empty url>'}  ${requestConfig.method || '<empty method>'}`
        );
      }
      // skip flush for legacy belongsTo
      if (requestConfig.op === 'findBelongsTo' && !requestConfig.url) {
        return;
      }
      this.notifications._flush();
    });

    return future;
  }

  /**
   * A hook which an app or addon may implement. Called when
   * the Store is attempting to create a Record Instance for
   * a resource.
   *
   * This hook can be used to select or instantiate any desired
   * mechanism of presentating cache data to the ui for access
   * mutation, and interaction.
   *
   * @method instantiateRecord (hook)
   * @param identifier
   * @param createRecordArgs
   * @param recordDataFor deprecated use this.cache
   * @param notificationManager deprecated use this.notifications
   * @returns A record instance
   * @public
   */

  /**
   * A hook which an app or addon may implement. Called when
   * the Store is destroying a Record Instance. This hook should
   * be used to teardown any custom record instances instantiated
   * with `instantiateRecord`.
   *
   * @method teardownRecord (hook)
   * @public
   * @param record
   */

  /**
   * Provides access to the SchemaDefinitionService instance
   * for this Store instance.
   *
   * The SchemaDefinitionService can be used to query for
   * information about the schema of a resource.
   *
   * @method getSchemaDefinitionService
   * @public
   */
  getSchemaDefinitionService(): SchemaService {
    assert(`You must registerSchemaDefinitionService with the store to use custom model classes`, this._schema);
    return this._schema;
  }

  /**
   * DEPRECATED - Use `registerSchema` instead.
   *
   * Allows an app to register a custom SchemaService
   * for use when information about a resource's schema needs
   * to be queried.
   *
   * This method can only be called more than once, but only one schema
   * definition service may exist. Therefore if you wish to chain services
   * you must lookup the existing service and close over it with the new
   * service by accessing `store.schema` prior to registration.
   *
   * For Example:
   *
   * ```ts
   * import Store from '@ember-data/store';
   *
   * class SchemaDelegator {
   *   constructor(schema) {
   *     this._schema = schema;
   *   }
   *
   *   doesTypeExist(type: string): boolean {
   *     if (AbstractSchemas.has(type)) {
   *       return true;
   *     }
   *     return this._schema.doesTypeExist(type);
   *   }
   *
   *   attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
   *     return this._schema.attributesDefinitionFor(identifier);
   *   }
   *
   *   relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema {
   *     const schema = AbstractSchemas.get(identifier.type);
   *     return schema || this._schema.relationshipsDefinitionFor(identifier);
   *   }
   * }
   *
   * export default class extends Store {
   *   constructor(...args) {
   *     super(...args);
   *
   *     const schema = this.schema;
   *     this.registerSchemaDefinitionService(new SchemaDelegator(schema));
   *   }
   * }
   * ```
   *
   * @method registerSchemaDefinitionService
   * @param {SchemaService} schema
   * @deprecated
   * @public
   */
  registerSchemaDefinitionService(schema: SchemaService) {
    this._schema = schema;
  }
  /**
   * Allows an app to register a custom SchemaService
   * for use when information about a resource's schema needs
   * to be queried.
   *
   * This method can only be called more than once, but only one schema
   * definition service may exist. Therefore if you wish to chain services
   * you must lookup the existing service and close over it with the new
   * service by accessing `store.schema` prior to registration.
   *
   * For Example:
   *
   * ```ts
   * import Store from '@ember-data/store';
   *
   * class SchemaDelegator {
   *   constructor(schema) {
   *     this._schema = schema;
   *   }
   *
   *   doesTypeExist(type: string): boolean {
   *     if (AbstractSchemas.has(type)) {
   *       return true;
   *     }
   *     return this._schema.doesTypeExist(type);
   *   }
   *
   *   attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
   *     return this._schema.attributesDefinitionFor(identifier);
   *   }
   *
   *   relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema {
   *     const schema = AbstractSchemas.get(identifier.type);
   *     return schema || this._schema.relationshipsDefinitionFor(identifier);
   *   }
   * }
   *
   * export default class extends Store {
   *   constructor(...args) {
   *     super(...args);
   *
   *     const schema = this.schema;
   *     this.registerSchema(new SchemaDelegator(schema));
   *   }
   * }
   * ```
   *
   * @method registerSchema
   * @param {SchemaService} schema
   * @public
   */
  registerSchema(schema: SchemaService) {
    this._schema = schema;
  }

  /**
    Returns the schema for a particular `modelName`.

    When used with Model from @ember-data/model the return is the model class,
    but this is not guaranteed.

    If looking to query attribute or relationship information it is
    recommended to use `getSchemaDefinitionService` instead. This method
    should be considered legacy and exists primarily to continue to support
    Adapter/Serializer APIs which expect it's return value in their method
    signatures.

    The class of a model might be useful if you want to get a list of all the
    relationship names of the model, see
    [`relationshipNames`](/ember-data/release/classes/Model?anchor=relationshipNames)
    for example.

    @method modelFor
    @public
    @param {String} type
    @return {ModelSchema}
    */
  // TODO @deprecate in favor of schema APIs, requires adapter/serializer overhaul or replacement

  modelFor(type: string): ModelSchema {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, 'modelFor');
    }
    assert(`You need to pass <type> to the store's modelFor method`, typeof type === 'string' && type.length);
    assert(
      `No model was found for '${type}' and no schema handles the type`,
      this.getSchemaDefinitionService().doesTypeExist(type)
    );

    return getShimClass(this, type);
  }

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    To create a new instance of a `Post`:

    ```js
    store.createRecord('post', {
      title: 'Ember is awesome!'
    });
    ```

    To create a new instance of a `Post` that has a relationship with a `User` record:

    ```js
    let user = this.store.peekRecord('user', 1);
    store.createRecord('post', {
      title: 'Ember is awesome!',
      user: user
    });
    ```

    @method createRecord
    @public
    @param {String} modelName
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {Model} record
  */
  createRecord(modelName: string, inputProperties: CreateRecordProperties): RecordInstance {
    if (DEBUG) {
      assertDestroyingStore(this, 'createRecord');
    }
    assert(`You need to pass a model name to the store's createRecord method`, modelName);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    // This is wrapped in a `run.join` so that in test environments users do not need to manually wrap
    //   calls to `createRecord`. The run loop usage here is because we batch the joining and updating
    //   of record-arrays via ember's run loop, not our own.
    //
    //   to remove this, we would need to move to a new `async` API.
    let record!: RecordInstance;
    emberBackburner.join(() => {
      this._join(() => {
        let normalizedModelName = normalizeModelName(modelName);
        let properties = { ...inputProperties };

        // If the passed properties do not include a primary key,
        // give the adapter an opportunity to generate one. Typically,
        // client-side ID generators will use something like uuid.js
        // to avoid conflicts.

        if (properties.id === null || properties.id === undefined) {
          let adapter = this.adapterFor(modelName);

          if (adapter && adapter.generateIdForRecord) {
            properties.id = adapter.generateIdForRecord(this, modelName, properties);
          } else {
            properties.id = null;
          }
        }

        // Coerce ID to a string
        properties.id = coerceId(properties.id);
        const resource = { type: normalizedModelName, id: properties.id };

        if (resource.id) {
          const identifier = this.identifierCache.peekRecordIdentifier(resource as ResourceIdentifierObject);

          assert(
            `The id ${properties.id} has already been used with another '${normalizedModelName}' record.`,
            !identifier
          );
        }

        const identifier = this.identifierCache.createIdentifierForNewRecord(resource);
        const cache = this.cache;

        const createOptions = normalizeProperties(this, identifier, properties);
        const resultProps = cache.clientDidCreate(identifier, createOptions);

        record = this._instanceCache.getRecord(identifier, resultProps);
      });
    });
    return record;
  }

  /**
    For symmetry, a record can be deleted via the store.

    Example

    ```javascript
    let post = store.createRecord('post', {
      title: 'Ember is awesome!'
    });

    store.deleteRecord(post);
    ```

    @method deleteRecord
    @public
    @param {Model} record
  */
  deleteRecord(record: RecordInstance): void {
    if (DEBUG) {
      assertDestroyingStore(this, 'deleteRecord');
    }

    const identifier = peekRecordIdentifier(record);
    const cache = this.cache;
    assert(`expected the record to be connected to a cache`, identifier);
    this._join(() => {
      cache.setIsDeleted(identifier, true);

      if (cache.isNew(identifier)) {
        emberBackburner.join(() => {
          this._instanceCache.unloadRecord(identifier);
        });
      }
    });
  }

  /**
    For symmetry, a record can be unloaded via the store.
    This will cause the record to be destroyed and freed up for garbage collection.

    Example

    ```javascript
    store.findRecord('post', 1).then(function(post) {
      store.unloadRecord(post);
    });
    ```

    @method unloadRecord
    @public
    @param {Model} record
  */
  unloadRecord(record: RecordInstance): void {
    if (DEBUG) {
      assertDestroyingStore(this, 'unloadRecord');
    }
    const identifier = peekRecordIdentifier(record);
    if (identifier) {
      this._instanceCache.unloadRecord(identifier);
    }
  }

  /**
    This method returns a record for a given identifier or type and id combination.

    The `findRecord` method will always resolve its promise with the same
    object for a given identifier or type and `id`.

    The `findRecord` method will always return a **promise** that will be
    resolved with the record.

    **Example 1**

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id }) {
        return this.store.findRecord('post', post_id);
      }
    }
    ```

    **Example 2**

    `findRecord` can be called with a single identifier argument instead of the combination
    of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
    the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id: id }) {
        return this.store.findRecord({ type: 'post', id });
      }
    }
    ```

    **Example 3**

    If you have previously received an lid via an Identifier for this record, and the record
    has already been assigned an id, you can find the record again using just the lid.

    ```app/routes/post.js
    store.findRecord({ lid });
    ```

    If the record is not yet available, the store will ask the adapter's `findRecord`
    method to retrieve and supply the necessary data. If the record is already present
    in the store, it depends on the reload behavior _when_ the returned promise
    resolves.

    ### Preloading

    You can optionally `preload` specific attributes and relationships that you know of
    by passing them via the passed `options`.

    For example, if your Ember route looks like `/posts/1/comments/2` and your API route
    for the comment also looks like `/posts/1/comments/2` if you want to fetch the comment
    without also fetching the post you can pass in the post to the `findRecord` call:

    ```app/routes/post-comments.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id, comment_id: id }) {
        return this.store.findRecord({ type: 'comment', id, { preload: { post: post_id }} });
      }
    }
    ```

    In your adapter you can then access this id without triggering a network request via the
    snapshot:

    ```app/adapters/application.js
    import EmberObject from '@ember/object';

    export default class Adapter extends EmberObject {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'comment')
          let postId = snapshot.belongsTo('post', { id: true });

          return fetch(`./posts/${postId}/comments/${id}`)
            .then(response => response.json())
        }
      }
    }
    ```

    This could also be achieved by supplying the post id to the adapter via the adapterOptions
    property on the options hash.

    ```app/routes/post-comments.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id, comment_id: id }) {
        return this.store.findRecord({ type: 'comment', id, { adapterOptions: { post: post_id }} });
      }
    }
    ```

    ```app/adapters/application.js
    import EmberObject from '@ember/object';

    export default class Adapter extends EmberObject {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'comment')
          let postId = snapshot.adapterOptions.post;

          return fetch(`./posts/${postId}/comments/${id}`)
            .then(response => response.json())
        }
      }
    }
    ```

    If you have access to the post model you can also pass the model itself to preload:

    ```javascript
    let post = await store.findRecord('post', 1);
    let comment = await store.findRecord('comment', 2, { post: myPostModel });
    ```

    ### Reloading

    The reload behavior is configured either via the passed `options` hash or
    the result of the adapter's `shouldReloadRecord`.

    If `{ reload: true }` is passed or `adapter.shouldReloadRecord` evaluates
    to `true`, then the returned promise resolves once the adapter returns
    data, regardless if the requested record is already in the store:

    ```js
    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    // adapter#findRecord resolves with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]
    store.findRecord('post', 1, { reload: true }).then(function(post) {
      post.revision; // 2
    });
    ```

    If no reload is indicated via the above mentioned ways, then the promise
    immediately resolves with the cached version in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadRecord` evaluates to `true`,
    then a background reload is started, which updates the records' data, once
    it is available:

    ```js
    // app/adapters/post.js
    import ApplicationAdapter from "./application";

    export default class PostAdapter extends ApplicationAdapter {
      shouldReloadRecord(store, snapshot) {
        return false;
      },

      shouldBackgroundReloadRecord(store, snapshot) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    let blogPost = store.findRecord('post', 1).then(function(post) {
      post.revision; // 1
    });

    // later, once adapter#findRecord resolved with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]

    blogPost.revision; // 2
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findRecord`.

    ```app/routes/post/edit.js
    import Route from '@ember/routing/route';

    export default class PostEditRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { backgroundReload: false });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to your adapter via the snapshot

    ```app/routes/post/edit.js
    import Route from '@ember/routing/route';

    export default class PostEditRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, {
          adapterOptions: { subscribe: false }
        });
      }
    }
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default class PostAdapter extends MyCustomAdapter {
      findRecord(store, type, id, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    }
    ```

    See [peekRecord](../methods/peekRecord?anchor=peekRecord) to get the cached version of a record.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](/ember-data/release/classes/JSONAPIAdapter)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findRecord()` or `findAll()` to automatically retrieve additional records related to
    the one you request by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve a specific post we can have the server also return that post's
    comments in the same request:

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { include: 'comments' });
      }
    }
    ```

    ```app/adapters/application.js
    import EmberObject from '@ember/object';

    export default class Adapter extends EmberObject {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'post')
          let includes = snapshot.adapterOptions.include;

          return fetch(`./posts/${postId}?include=${includes}`)
            .then(response => response.json())
        }
      }
    }
    ```

    In this case, the post's comments would then be available in your template as
    `model.comments`.

    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the post's
    comments and the authors of those comments the request would look like this:

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { include: 'comments,comments.author' });
      }
    }
    ```

    ### Retrieving Specific Fields by Type

    If your server endpoint supports the use of a ['fields' query parameter](https://jsonapi.org/format/#fetching-sparse-fieldsets),
    you can use pass those fields through to your server.  At this point in time, this requires a few manual steps on your part.

    1. Implement `buildQuery` in your adapter.

    ```app/adapters/application.js
    buildQuery(snapshot) {
      let query = super.buildQuery(...arguments);

      let { fields } = snapshot.adapterOptions;

      if (fields) {
        query.fields = fields;
      }

      return query;
    }
    ```

    2. Then pass through the applicable fields to your `findRecord` request.

    Given a `post` model with attributes body, title, publishDate and meta, you can retrieve a filtered list of attributes.

    ```app/routes/post.js
    import Route from '@ember/routing/route';
    export default Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id, { adapterOptions: { fields: { post: 'body,title' } });
      }
    });
    ```

    Moreover, you can filter attributes on related models as well. If a `post` has a `belongsTo` relationship to a user,
    just include the relationship key and attributes.

    ```app/routes/post.js
    import Route from '@ember/routing/route';
    export default Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id, { adapterOptions: { fields: { post: 'body,title', user: 'name,email' } });
      }
    });
    ```

    @since 1.13.0
    @method findRecord
    @public
    @param {String|object} modelName - either a string representing the modelName or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
    @param {(String|Integer|Object)} id - optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved
    @param {Object} [options] - if the first param is a string this will be the optional options for the request. See examples for available options.
    @return {Promise} promise
  */
  findRecord(resource: string, id: string | number, options?: FindOptions): Promise<RecordInstance>;
  findRecord(resource: ResourceIdentifierObject, id?: FindOptions): Promise<RecordInstance>;
  findRecord(
    resource: string | ResourceIdentifierObject,
    id?: string | number | FindOptions,
    options?: FindOptions
  ): Promise<RecordInstance> {
    if (DEBUG) {
      assertDestroyingStore(this, 'findRecord');
    }

    assert(
      `You need to pass a modelName or resource identifier as the first argument to the store's findRecord method`,
      resource
    );
    if (isMaybeIdentifier(resource)) {
      options = id as FindOptions | undefined;
    } else {
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${resource}`,
        typeof resource === 'string'
      );
      const type = normalizeModelName(resource);
      const normalizedId = ensureStringId(id as string | number);
      resource = constructResource(type, normalizedId);
    }

    const identifier = this.identifierCache.getOrCreateRecordIdentifier(resource);
    options = options || {};

    if (options.preload) {
      // force reload if we preload to ensure we don't resolve the promise
      // until we are complete, else we will end up background-reloading
      // even for initial load.
      if (!this._instanceCache.recordIsLoaded(identifier)) {
        options.reload = true;
      }
      this._join(() => {
        preloadData(this, identifier, options!.preload!);
      });
    }

    const promise = this.request<RecordInstance>({
      op: 'findRecord',
      data: {
        record: identifier,
        options,
      },
      cacheOptions: { [SkipCache as symbol]: true },
    });

    return promise.then((document) => {
      return document.content;
    });
  }

  /**
    Get the reference for the specified record.

    Example

    ```javascript
    let userRef = store.getReference('user', 1);

    // check if the user is loaded
    let isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    let user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === 'id') {
    let id = userRef.id();
    }

    // load user (via store.find)
    userRef.load().then(...)

    // or trigger a reload
    userRef.reload().then(...)

    // provide data for reference
    userRef.push({ id: 1, username: '@user' }).then(function(user) {
      userRef.value() === user;
    });
    ```

    @method getReference
    @public
    @param {String|object} resource - modelName (string) or Identifier (object)
    @param {String|Integer} id
    @since 2.5.0
    @return {RecordReference}
  */
  // TODO @deprecate getReference (and references generally)
  getReference(resource: string | ResourceIdentifierObject, id: string | number): RecordReference {
    if (DEBUG) {
      assertDestroyingStore(this, 'getReference');
    }

    let resourceIdentifier;
    if (arguments.length === 1 && isMaybeIdentifier(resource)) {
      resourceIdentifier = resource;
    } else {
      const type = normalizeModelName(resource as string);
      const normalizedId = ensureStringId(id);
      resourceIdentifier = constructResource(type, normalizedId);
    }

    assert(
      'getReference expected to receive either a resource identifier or type and id as arguments',
      isMaybeIdentifier(resourceIdentifier)
    );

    let identifier: StableRecordIdentifier = this.identifierCache.getOrCreateRecordIdentifier(resourceIdentifier);

    return this._instanceCache.getReference(identifier);
  }

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it is available in the store,
    otherwise it will return `null`. A record is available if it has been fetched earlier, or
    pushed manually into the store.

    See [findRecord](../methods/findRecord?anchor=findRecord) if you would like to request this record from the backend.

    _Note: This is a synchronous method and does not return a promise._

    **Example 1**

    ```js
    let post = store.peekRecord('post', 1);

    post.id; // 1
    ```

    `peekRecord` can be called with a single identifier argument instead of the combination
    of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
    the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

    **Example 2**

    ```js
    let post = store.peekRecord({ type: 'post', id });
    post.id; // 1
    ```

    If you have previously received an lid from an Identifier for this record, you can lookup the record again using
    just the lid.

    **Example 3**

    ```js
    let post = store.peekRecord({ lid });
    post.id; // 1
    ```


    @since 1.13.0
    @method peekRecord
    @public
    @param {String|object} modelName - either a string representing the modelName or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
    @param {String|Integer} id - optional only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved.
    @return {Model|null} record
  */
  peekRecord(identifier: string, id: string | number): RecordInstance | null;
  peekRecord(identifier: ResourceIdentifierObject): RecordInstance | null;
  peekRecord(identifier: ResourceIdentifierObject | string, id?: string | number): RecordInstance | null {
    if (arguments.length === 1 && isMaybeIdentifier(identifier)) {
      const stableIdentifier = this.identifierCache.peekRecordIdentifier(identifier);
      const isLoaded = stableIdentifier && this._instanceCache.recordIsLoaded(stableIdentifier);
      // TODO come up with a better mechanism for determining if we have data and could peek.
      // this is basically an "are we not empty" query.
      return isLoaded ? this._instanceCache.getRecord(stableIdentifier) : null;
    }

    if (DEBUG) {
      assertDestroyingStore(this, 'peekRecord');
    }

    assert(`You need to pass a model name to the store's peekRecord method`, identifier);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${identifier}`,
      typeof identifier === 'string'
    );

    const type = normalizeModelName(identifier);
    const normalizedId = ensureStringId(id);
    const resource = { type, id: normalizedId };
    const stableIdentifier = this.identifierCache.peekRecordIdentifier(resource);
    const isLoaded = stableIdentifier && this._instanceCache.recordIsLoaded(stableIdentifier);

    return isLoaded ? this._instanceCache.getRecord(stableIdentifier) : null;
  }

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Each time this method is called a new request is made through the adapter.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    ---

    If you do something like this:

    ```javascript
    store.query('person', { page: 1 });
    ```

    The request made to the server will look something like this:

    ```
    GET "/api/v1/person?page=1"
    ```

    ---

    If you do something like this:

    ```javascript
    store.query('person', { ids: [1, 2, 3] });
    ```

    The request made to the server will look something like this:

    ```
    GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
    decoded: "/api/v1/person?ids[]=1&ids[]=2&ids[]=3"
    ```

    This method returns a promise, which is resolved with a
    [`Collection`](/ember-data/release/classes/Collection)
    once the server returns.

    @since 1.13.0
    @method query
    @public
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter.query
    @return {Promise} promise
  */
  query(
    modelName: string,
    query: Record<string, unknown>,
    options: { [key: string]: unknown; adapterOptions?: Record<string, unknown> }
  ): Promise<Collection> {
    if (DEBUG) {
      assertDestroyingStore(this, 'query');
    }
    assert(`You need to pass a model name to the store's query method`, modelName);
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    const promise = this.request<Collection>({
      op: 'query',
      data: {
        type: normalizeModelName(modelName),
        query,
        options: options || {},
      },
      cacheOptions: { [SkipCache as symbol]: true },
    });

    return promise.then((document) => document.content);
  }

  /**
    This method makes a request for one record, where the `id` is not known
    beforehand (if the `id` is known, use [`findRecord`](../methods/findRecord?anchor=findRecord)
    instead).

    This method can be used when it is certain that the server will return a
    single object for the primary data.

    Each time this method is called a new request is made through the adapter.

    Let's assume our API provides an endpoint for the currently logged in user
    via:

    ```
    // GET /api/current_user
    {
      user: {
        id: 1234,
        username: 'admin'
      }
    }
    ```

    Since the specific `id` of the `user` is not known beforehand, we can use
    `queryRecord` to get the user:

    ```javascript
    store.queryRecord('user', {}).then(function(user) {
      let username = user.username;
      // do thing
    });
    ```

    The request is made through the adapters' `queryRecord`:

    ```app/adapters/user.js
    import Adapter from '@ember-data/adapter';
    import $ from 'jquery';

    export default class UserAdapter extends Adapter {
      queryRecord(modelName, query) {
        return $.getJSON('/api/current_user');
      }
    }
    ```

    Note: the primary use case for `store.queryRecord` is when a single record
    is queried and the `id` is not known beforehand. In all other cases
    `store.query` and using the first item of the array is likely the preferred
    way:

    ```
    // GET /users?username=unique
    {
      data: [{
        id: 1234,
        type: 'user',
        attributes: {
          username: "unique"
        }
      }]
    }
    ```

    ```javascript
    store.query('user', { username: 'unique' }).then(function(users) {
      return users.firstObject;
    }).then(function(user) {
      let id = user.id;
    });
    ```

    This method returns a promise, which resolves with the found record.

    If the adapter returns no data for the primary data of the payload, then
    `queryRecord` resolves with `null`:

    ```
    // GET /users?username=unique
    {
      data: null
    }
    ```

    ```javascript
    store.queryRecord('user', { username: 'unique' }).then(function(user) {
       // user is null
    });
    ```

    @since 1.13.0
    @method queryRecord
    @public
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter.queryRecord
    @return {Promise} promise which resolves with the found record or `null`
  */
  queryRecord(modelName: string, query: Record<string, unknown>, options?): Promise<RecordInstance | null> {
    if (DEBUG) {
      assertDestroyingStore(this, 'queryRecord');
    }
    assert(`You need to pass a model name to the store's queryRecord method`, modelName);
    assert(`You need to pass a query hash to the store's queryRecord method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    const promise = this.request<RecordInstance | null>({
      op: 'queryRecord',
      data: {
        type: normalizeModelName(modelName),
        query,
        options: options || {},
      },
      cacheOptions: { [SkipCache as symbol]: true },
    });

    return promise.then((document) => document.content);
  }

  /**
    `findAll` asks the adapter's `findAll` method to find the records for the
    given type, and returns a promise which will resolve with all records of
    this type present in the store, even if the adapter only returns a subset
    of them.

    ```app/routes/authors.js
    import Route from '@ember/routing/route';

    export default class AuthorsRoute extends Route {
      model(params) {
        return this.store.findAll('author');
      }
    }
    ```

    _When_ the returned promise resolves depends on the reload behavior,
    configured via the passed `options` hash and the result of the adapter's
    `shouldReloadAll` method.

    ### Reloading

    If `{ reload: true }` is passed or `adapter.shouldReloadAll` evaluates to
    `true`, then the returned promise resolves once the adapter returns data,
    regardless if there are already records in the store:

    ```js
    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    // adapter#findAll resolves with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]
    store.findAll('author', { reload: true }).then(function(authors) {
      authors.getEach('id'); // ['first', 'second']
    });
    ```

    If no reload is indicated via the above mentioned ways, then the promise
    immediately resolves with all the records currently loaded in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadAll` evaluates to `true`,
    then a background reload is started. Once this resolves, the array with
    which the promise resolves, is updated automatically so it contains all the
    records in the store:

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';

    export default class ApplicationAdapter extends Adapter {
      shouldReloadAll(store, snapshotsArray) {
        return false;
      },

      shouldBackgroundReloadAll(store, snapshotsArray) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    let allAuthors;
    store.findAll('author').then(function(authors) {
      authors.getEach('id'); // ['first']

      allAuthors = authors;
    });

    // later, once adapter#findAll resolved with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]

    allAuthors.getEach('id'); // ['first', 'second']
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findAll`.

    ```app/routes/post/edit.js
    import Route from '@ember/routing/route';

    export default class PostEditRoute extends Route {
      model() {
        return this.store.findAll('post', { backgroundReload: false });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to you adapter via the `snapshotRecordArray`

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      model(params) {
        return this.store.findAll('post', {
          adapterOptions: { subscribe: false }
        });
      }
    }
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default class UserAdapter extends MyCustomAdapter {
      findAll(store, type, sinceToken, snapshotRecordArray) {
        if (snapshotRecordArray.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    }
    ```

    See [peekAll](../methods/peekAll?anchor=peekAll) to get an array of current records in the
    store, without waiting until a reload is finished.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](/ember-data/release/classes/JSONAPIAdapter)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findAll()` to automatically retrieve additional records related to
    those requested by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve all of the post records we can have the server also return
    all of the posts' comments in the same request:

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      model() {
        return this.store.findAll('post', { include: 'comments' });
      }
    }
    ```
    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the posts'
    comments and the authors of those comments the request would look like this:

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      model() {
        return this.store.findAll('post', { include: 'comments,comments.author' });
      }
    }
    ```

    See [query](../methods/query?anchor=query) to only get a subset of records from the server.

    @since 1.13.0
    @method findAll
    @public
    @param {String} modelName
    @param {Object} options
    @return {Promise} promise
  */
  findAll(modelName: string, options: { reload?: boolean; backgroundReload?: boolean } = {}): Promise<IdentifierArray> {
    if (DEBUG) {
      assertDestroyingStore(this, 'findAll');
    }
    assert(`You need to pass a model name to the store's findAll method`, modelName);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    const promise = this.request<IdentifierArray>({
      op: 'findAll',
      data: {
        type: normalizeModelName(modelName),
        options: options || {},
      },
      cacheOptions: { [SkipCache as symbol]: true },
    });

    return promise.then((document) => document.content);
  }

  /**
    This method returns a filtered array that contains all of the
    known records for a given type in the store.

    Note that because it's just a filter, the result will contain any
    locally created records of the type, however, it will not make a
    request to the backend to retrieve additional records. If you
    would like to request all the records from the backend please use
    [store.findAll](../methods/findAll?anchor=findAll).

    Also note that multiple calls to `peekAll` for a given type will always
    return the same `RecordArray`.

    Example

    ```javascript
    let localPosts = store.peekAll('post');
    ```

    @since 1.13.0
    @method peekAll
    @public
    @param {String} modelName
    @return {RecordArray}
  */
  peekAll(modelName: string): IdentifierArray {
    if (DEBUG) {
      assertDestroyingStore(this, 'peekAll');
    }
    assert(`You need to pass a model name to the store's peekAll method`, modelName);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let type = normalizeModelName(modelName);
    return this.recordArrayManager.liveArrayFor(type);
  }

  /**
    This method unloads all records in the store.
    It schedules unloading to happen during the next run loop.

    Optionally you can pass a type which unload all records for a given type.

    ```javascript
    store.unloadAll();
    store.unloadAll('post');
    ```

    @method unloadAll
    @public
    @param {String} modelName
  */
  unloadAll(modelName?: string) {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, 'unloadAll');
    }
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      !modelName || typeof modelName === 'string'
    );

    this._join(() => {
      if (modelName === undefined) {
        // destroy the graph before unloadAll
        // since then we avoid churning relationships
        // during unload
        this._graph?.identifiers.clear();

        this.recordArrayManager.clear();
        this._instanceCache.clear();
      } else {
        let normalizedModelName = normalizeModelName(modelName);
        this._instanceCache.clear(normalizedModelName);
      }
    });
  }

  /**
    Push some data for a given type into the store.

    This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:
    - record's `type` should always be in singular, dasherized form
    - members (properties) should be camelCased

    [Your primary data should be wrapped inside `data` property](http://jsonapi.org/format/#document-top-level):

    ```js
    store.push({
      data: {
        // primary data for single record of type `Person`
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Daniel',
          lastName: 'Kmak'
        }
      }
    });
    ```

    [Demo.](http://ember-twiddle.com/fb99f18cd3b4d3e2a4c7)

    `data` property can also hold an array (of records):

    ```js
    store.push({
      data: [
        // an array of records
        {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Daniel',
            lastName: 'Kmak'
          }
        },
        {
          id: '2',
          type: 'person',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale'
          }
        }
      ]
    });
    ```

    [Demo.](http://ember-twiddle.com/69cdbeaa3702159dc355)

    There are some typical properties for `JSONAPI` payload:
    * `id` - mandatory, unique record's key
    * `type` - mandatory string which matches `model`'s dasherized name in singular form
    * `attributes` - object which holds data for record attributes - `attr`'s declared in model
    * `relationships` - object which must contain any of the following properties under each relationships' respective key (example path is `relationships.achievements.data`):
      - [`links`](http://jsonapi.org/format/#document-links)
      - [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
      - [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

    For this model:

    ```app/models/person.js
    import Model, { attr, hasMany } from '@ember-data/model';

    export default class PersonRoute extends Route {
      @attr('string') firstName;
      @attr('string') lastName;

      @hasMany('person') children;
    }
    ```

    To represent the children as IDs:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            data: [
              {
                id: '2',
                type: 'person'
              },
              {
                id: '3',
                type: 'person'
              },
              {
                id: '4',
                type: 'person'
              }
            ]
          }
        }
      }
    }
    ```

    [Demo.](http://ember-twiddle.com/343e1735e034091f5bde)

    To represent the children relationship as a URL:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            links: {
              related: '/people/1/children'
            }
          }
        }
      }
    }
    ```

    If you're streaming data or implementing an adapter, make sure
    that you have converted the incoming data into this form. The
    store's [normalize](../methods/normalize?anchor=normalize) method is a convenience
    helper for converting a json payload into the form Ember Data
    expects.

    ```js
    store.push(store.normalize('person', data));
    ```

    This method can be used both to push in brand new
    records, as well as to update existing records.

    @method push
    @public
    @param {Object} data
    @return the record(s) that was created or
      updated.
  */
  push(data: EmptyResourceDocument): null;
  push(data: SingleResourceDocument): RecordInstance;
  push(data: CollectionResourceDocument): RecordInstance[];
  push(data: JsonApiDocument): RecordInstance | RecordInstance[] | null {
    if (DEBUG) {
      assertDestroyingStore(this, 'push');
    }
    let pushed = this._push(data, false);

    if (Array.isArray(pushed)) {
      let records = pushed.map((identifier) => this._instanceCache.getRecord(identifier));
      return records;
    }

    if (pushed === null) {
      return null;
    }

    return this._instanceCache.getRecord(pushed);
  }

  /**
    Push some data in the form of a json-api document into the store,
    without creating materialized records.

    @method _push
    @private
    @param {Object} jsonApiDoc
    @return {StableRecordIdentifier|Array<StableRecordIdentifier>} identifiers for the primary records that had data loaded
  */
  _push(
    jsonApiDoc: JsonApiDocument,
    asyncFlush?: boolean
  ): StableExistingRecordIdentifier | StableExistingRecordIdentifier[] | null {
    if (DEBUG) {
      assertDestroyingStore(this, '_push');
    }
    if (LOG_PAYLOADS) {
      try {
        let data = JSON.parse(JSON.stringify(jsonApiDoc));
        // eslint-disable-next-line no-console
        console.log('EmberData | Payload - push', data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('EmberData | Payload - push', jsonApiDoc);
      }
    }
    if (asyncFlush) {
      this._enableAsyncFlush = true;
    }
    let ret;
    this._join(() => {
      ret = this.cache.put({ content: jsonApiDoc });
    });

    this._enableAsyncFlush = null;

    return ret.data;
  }

  /**
    Push some raw data into the store.

    This method can be used both to push in brand new
    records, as well as to update existing records. You
    can push in more than one type of object at once.
    All objects should be in the format expected by the
    serializer.

    ```app/serializers/application.js
    import RESTSerializer from '@ember-data/serializer/rest';

    export default class ApplicationSerializer extends RESTSerializer;
    ```

    ```js
    let pushData = {
      posts: [
        { id: 1, postTitle: "Great post", commentIds: [2] }
      ],
      comments: [
        { id: 2, commentBody: "Insightful comment" }
      ]
    }

    store.pushPayload(pushData);
    ```

    By default, the data will be deserialized using a default
    serializer (the application serializer if it exists).

    Alternatively, `pushPayload` will accept a model type which
    will determine which serializer will process the payload.

    ```app/serializers/application.js
    import RESTSerializer from '@ember-data/serializer/rest';

     export default class ApplicationSerializer extends RESTSerializer;
    ```

    ```app/serializers/post.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default JSONSerializer;
    ```

    ```js
    store.pushPayload(pushData); // Will use the application serializer
    store.pushPayload('post', pushData); // Will use the post serializer
    ```

    @method pushPayload
    @public
    @param {String} modelName Optionally, a model type used to determine which serializer will be used
    @param {Object} inputPayload
  */
  // TODO @runspired @deprecate pushPayload in favor of looking up the serializer
  pushPayload(modelName, inputPayload) {
    if (DEBUG) {
      assertDestroyingStore(this, 'pushPayload');
    }
    let serializer;
    let payload;
    if (!inputPayload) {
      payload = modelName;
      serializer = this.serializerFor('application');
      assert(
        `You cannot use 'store#pushPayload' without a modelName unless your default serializer defines 'pushPayload'`,
        typeof serializer.pushPayload === 'function'
      );
    } else {
      payload = inputPayload;
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
        typeof modelName === 'string'
      );
      let normalizedModelName = normalizeModelName(modelName);
      serializer = this.serializerFor(normalizedModelName);
    }
    assert(
      `You must define a pushPayload method in your serializer in order to call store.pushPayload`,
      serializer.pushPayload
    );
    serializer.pushPayload(this, payload);
  }

  /**
   * Trigger a save for a Record.
   *
   * @method saveRecord
   * @public
   * @param {RecordInstance} record
   * @param options
   * @returns {Promise<RecordInstance>}
   */
  saveRecord(record: RecordInstance, options: Record<string, unknown> = {}): Promise<RecordInstance> {
    if (DEBUG) {
      assertDestroyingStore(this, 'saveRecord');
    }
    assert(`Unable to initate save for a record in a disconnected state`, storeFor(record));
    let identifier = recordIdentifierFor(record);
    const cache = this.cache;

    if (!identifier) {
      // this commonly means we're disconnected
      // but just in case we reject here to prevent bad things.
      return Promise.reject(`Record Is Disconnected`);
    }
    // TODO we used to check if the record was destroyed here
    assert(
      `Cannot initiate a save request for an unloaded record: ${identifier}`,
      this._instanceCache.recordIsLoaded(identifier)
    );
    if (resourceIsFullyDeleted(this._instanceCache, identifier)) {
      return Promise.resolve(record);
    }

    if (!options) {
      options = {};
    }
    let operation: 'createRecord' | 'deleteRecord' | 'updateRecord' = 'updateRecord';

    if (cache.isNew(identifier)) {
      operation = 'createRecord';
    } else if (cache.isDeleted(identifier)) {
      operation = 'deleteRecord';
    }

    const request = {
      op: operation,
      data: {
        options,
        record: identifier,
      },
      cacheOptions: { [SkipCache as symbol]: true },
    };

    // we lie here on the type because legacy doesn't have enough context
    cache.willCommit(identifier, { request } as unknown as StoreRequestContext);

    return this.request<RecordInstance>(request).then((document) => document.content);
  }

  /**
   * Instantiation hook allowing applications or addons to configure the store
   * to utilize a custom Cache implementation.
   *
   * This hook should not be called directly by consuming applications or libraries.
   * Use `Store.cache` to access the Cache instance.
   *
   * @method createCache (hook)
   * @public
   * @param storeWrapper
   * @returns {Cache}
   */

  /**
   * Returns the cache instance associated to this Store, instantiates the Cache
   * if necessary via `Store.createCache`
   *
   * @property {Cache} cache
   * @public
   */
  get cache(): Cache {
    let { cache } = this._instanceCache;
    if (!cache) {
      cache = this._instanceCache.cache = this.createCache(this._instanceCache._storeWrapper);
      if (DEBUG) {
        cache = new CacheManager(cache);
      }
    }
    return cache;
  }

  /**
    `normalize` converts a json payload into the normalized form that
    [push](../methods/push?anchor=push) expects.

    Example

    ```js
    socket.on('message', function(message) {
      let modelName = message.model;
      let data = message.data;
      store.push(store.normalize(modelName, data));
    });
    ```

    @method normalize
    @public
    @param {String} modelName The name of the model type for this payload
    @param {Object} payload
    @return {Object} The normalized payload
  */
  // TODO @runspired @deprecate users should call normalize on the associated serializer directly
  normalize(modelName: string, payload) {
    if (DEBUG) {
      assertDestroyingStore(this, 'normalize');
    }
    assert(`You need to pass a model name to the store's normalize method`, modelName);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${typeof modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);
    let serializer = this.serializerFor(normalizedModelName);
    let model = this.modelFor(normalizedModelName);
    assert(
      `You must define a normalize method in your serializer in order to call store.normalize`,
      serializer?.normalize
    );
    return serializer.normalize(model, payload);
  }

  /**
    Returns an instance of the adapter for a given type. For
    example, `adapterFor('person')` will return an instance of
    the adapter located at `app/adapters/person.js`

    If no `person` adapter is found, this method will look
    for an `application` adapter (the default adapter for
    your entire application).

    @method adapterFor
    @public
    @param {String} modelName
    @return Adapter
  */
  adapterFor(modelName: string) {
    if (DEBUG) {
      assertDestroyingStore(this, 'adapterFor');
    }
    assert(`You need to pass a model name to the store's adapterFor method`, modelName);
    assert(
      `Passing classes to store.adapterFor has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);

    let { _adapterCache } = this;
    let adapter = _adapterCache[normalizedModelName];
    if (adapter) {
      return adapter;
    }

    let owner: any = getOwner(this);

    // name specific adapter
    adapter = owner.lookup(`adapter:${normalizedModelName}`);
    if (adapter !== undefined) {
      _adapterCache[normalizedModelName] = adapter;
      return adapter;
    }

    // no adapter found for the specific name, fallback and check for application adapter
    adapter = _adapterCache.application || owner.lookup('adapter:application');
    if (adapter !== undefined) {
      _adapterCache[normalizedModelName] = adapter;
      _adapterCache.application = adapter;
      return adapter;
    }

    assert(`No adapter was found for '${modelName}' and no 'application' adapter was found as a fallback.`);
  }

  /**
    Returns an instance of the serializer for a given type. For
    example, `serializerFor('person')` will return an instance of
    `App.PersonSerializer`.

    If no `App.PersonSerializer` is found, this method will look
    for an `App.ApplicationSerializer` (the default serializer for
    your entire application).

    If a serializer cannot be found on the adapter, it will fall back
    to an instance of `JSONSerializer`.

    @method serializerFor
    @public
    @param {String} modelName the record to serialize
    @return {Serializer}
  */
  serializerFor(modelName: string): MinimumSerializerInterface | null {
    if (DEBUG) {
      assertDestroyingStore(this, 'serializerFor');
    }
    assert(`You need to pass a model name to the store's serializerFor method`, modelName);
    assert(
      `Passing classes to store.serializerFor has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);

    let { _serializerCache } = this;
    let serializer = _serializerCache[normalizedModelName];
    if (serializer) {
      return serializer;
    }

    let owner: any = getOwner(this);

    // by name
    serializer = owner.lookup(`serializer:${normalizedModelName}`);
    if (serializer !== undefined) {
      _serializerCache[normalizedModelName] = serializer;
      return serializer;
    }

    // no serializer found for the specific model, fallback and check for application serializer
    serializer = _serializerCache.application || owner.lookup('serializer:application');
    if (serializer !== undefined) {
      _serializerCache[normalizedModelName] = serializer;
      _serializerCache.application = serializer;
      return serializer;
    }

    return null;
  }

  // @ts-expect-error
  destroy(): void {
    if (this.isDestroyed) {
      // @ember/test-helpers will call destroy multiple times
      return;
    }
    this.isDestroying = true;
    // enqueue destruction of any adapters/serializers we have created
    for (let adapterName in this._adapterCache) {
      let adapter = this._adapterCache[adapterName]!;
      if (typeof adapter.destroy === 'function') {
        adapter.destroy();
      }
    }

    for (let serializerName in this._serializerCache) {
      let serializer = this._serializerCache[serializerName]!;
      if (typeof serializer.destroy === 'function') {
        serializer.destroy();
      }
    }

    this._graph?.destroy();
    this._graph = undefined;

    this.notifications.destroy();
    this.recordArrayManager.destroy();
    this.identifierCache.destroy();

    this.unloadAll();
    this.isDestroyed = true;
  }

  static create(args?: Record<string, unknown>) {
    return new this(args);
  }
}

export default Store;

let assertDestroyingStore: Function;
let assertDestroyedStoreOnly: Function;

if (DEBUG) {
  assertDestroyingStore = function assertDestroyedStore(store, method) {
    assert(
      `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
      !(store.isDestroying || store.isDestroyed)
    );
  };
  assertDestroyedStoreOnly = function assertDestroyedStoreOnly(store, method) {
    assert(
      `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
      !store.isDestroyed
    );
  };
}

function isMaybeIdentifier(
  maybeIdentifier: string | ResourceIdentifierObject
): maybeIdentifier is ResourceIdentifierObject {
  return Boolean(
    maybeIdentifier !== null &&
      typeof maybeIdentifier === 'object' &&
      (('id' in maybeIdentifier && 'type' in maybeIdentifier && maybeIdentifier.id && maybeIdentifier.type) ||
        maybeIdentifier.lid)
  );
}

function normalizeProperties(
  store: Store,
  identifier: StableRecordIdentifier,
  properties?: { [key: string]: unknown }
): { [key: string]: unknown } | undefined {
  // assert here
  if (properties !== undefined) {
    if ('id' in properties) {
      assert(`expected id to be a string or null`, properties.id !== undefined);
    }
    assert(
      `You passed '${typeof properties}' as properties for record creation instead of an object.`,
      typeof properties === 'object' && properties !== null
    );

    const { type } = identifier;

    // convert relationship Records to RecordDatas before passing to RecordData
    let defs = store.getSchemaDefinitionService().relationshipsDefinitionFor({ type });

    if (defs !== null) {
      let keys = Object.keys(properties);
      let relationshipValue;

      for (let i = 0; i < keys.length; i++) {
        let prop = keys[i];
        let def = defs[prop];

        if (def !== undefined) {
          if (def.kind === 'hasMany') {
            if (DEBUG) {
              assertRecordsPassedToHasMany(properties[prop] as RecordInstance[]);
            }
            relationshipValue = extractIdentifiersFromRecords(properties[prop] as RecordInstance[]);
          } else {
            relationshipValue = extractIdentifierFromRecord(properties[prop] as RecordInstance);
          }

          properties[prop] = relationshipValue;
        }
      }
    }
  }
  return properties;
}

function assertRecordsPassedToHasMany(records: RecordInstance[]) {
  assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(records));
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed ${records
      .map((r) => `${typeof r}`)
      .join(', ')}`,
    (function () {
      return records.every((record) => {
        try {
          recordIdentifierFor(record);
          return true;
        } catch {
          return false;
        }
      });
    })()
  );
}

function extractIdentifiersFromRecords(records: RecordInstance[]): StableRecordIdentifier[] {
  return records.map((record) => extractIdentifierFromRecord(record)) as StableRecordIdentifier[];
}

type PromiseProxyRecord = { then(): void; content: RecordInstance | null | undefined };

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | RecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }
  const extract = recordIdentifierFor;

  return extract(recordOrPromiseRecord);
}
