import { deprecate } from '@ember/debug';

import { ENABLE_LEGACY_REQUEST_METHODS } from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/build-config/macros';

import type { ResourceKey } from '../../types/identifier';
import type { OpaqueRecordInstance, TypedRecordInstance, TypeFromInstance } from '../../types/record';
import { SkipCache } from '../../types/request';
import type { ResourceIdentifierObject } from '../../types/spec/json-api-raw';
import type { LegacyLiveArray, LegacyQueryArray } from '../-private';
import { constructResource, ensureStringId, recordIdentifierFor, storeFor } from '../-private';
import type { Caches } from '../-private/caches/instance-cache';
import { isMaybeIdentifier, Store } from '../-private/store-service';
import { normalizeModelName } from '../-private/utils/normalize-model-name';
import type { FindAllOptions, FindRecordOptions, LegacyResourceQuery, ModelSchema, QueryOptions } from './-private';
import { getShimClass, preloadData, RecordReference, resourceIsFullyDeleted } from './-private';

/////////////// IMPORTANT ///////////////////
///// Move Module Augmentation Into The /////
///// Legacy Package Once Removed Here  /////
/////////////////////////////////////////////
declare module '../-private/store-service' {
  export interface Store {
    /**
    This method returns a record for a given identifier or type and id combination.

    The `findRecord` method will always resolve its promise with the same
    object for a given identifier or type and `id`.

    The `findRecord` method will always return a **promise** that will be
    resolved with the record.

    **Example 1**

    ```js [app/routes/post.js]
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

    ```js [app/routes/post.js]
    export default class PostRoute extends Route {
      model({ post_id: id }) {
        return this.store.findRecord({ type: 'post', id });
      }
    }
    ```

    **Example 3**

    If you have previously received an lid via an Identifier for this record, and the record
    has already been assigned an id, you can find the record again using just the lid.

    ```js [app/routes/post.js]
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

    ```js [app/routes/post-comments.js]
    export default class PostRoute extends Route {
      model({ post_id, comment_id: id }) {
        return this.store.findRecord({ type: 'comment', id, { preload: { post: post_id }} });
      }
    }
    ```

    In your adapter you can then access this id without triggering a network request via the
    snapshot:

    ```js [app/adapters/application.js]
    export default class Adapter {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'comment')
          let postId = snapshot.belongsTo('post', { id: true });

          return fetch(`./posts/${postId}/comments/${id}`)
            .then(response => response.json())
        }
      }

      static create() {
        return new this();
      }
    }
    ```

    This could also be achieved by supplying the post id to the adapter via the adapterOptions
    property on the options hash.

    ```js [app/routes/post-comments.js]
    export default class PostRoute extends Route {
      model({ post_id, comment_id: id }) {
        return this.store.findRecord({ type: 'comment', id, { adapterOptions: { post: post_id }} });
      }
    }
    ```

    ```js [app/adapters/application.js]
    export default class Adapter {
      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'comment')
          let postId = snapshot.adapterOptions.post;

          return fetch(`./posts/${postId}/comments/${id}`)
            .then(response => response.json())
        }
      }

      static create() {
        return new this();
      }
    }
    ```

    If you have access to the post model you can also pass the model itself to preload:

    ```javascript
    let post = await store.findRecord('post', '1');
    let comment = await store.findRecord('comment', '2', { post: myPostModel });
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
    store.findRecord('post', '1', { reload: true }).then(function(post) {
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

    let blogPost = store.findRecord('post', '1').then(function(post) {
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

    ```js [app/routes/post/edit.js]
    export default class PostEditRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { backgroundReload: false });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to your adapter via the snapshot

    ```js [app/routes/post/edit.js]
    export default class PostEditRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, {
          adapterOptions: { subscribe: false }
        });
      }
    }
    ```

    ```js [app/adapters/post.js]
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

    See {@link Store.peekRecord | peekRecord} to get the cached version of a record.

    ### Retrieving Related Model Records

    If you use an adapter such as the
    [JSONAPIAdapter](/api/@warp-drive/legacy/adapter/json-api/classes/JSONAPIAdapter)
    which supports the [{json:api} specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findRecord()` or `findAll()` to automatically retrieve additional records related to
    the one you request by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve a specific post we can have the server also return that post's
    comments in the same request:

    ```js [app/routes/post.js]
    export default class PostRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { include: ['comments'] });
      }
    }
    ```

    ```js [app/adapters/application.js]
    export default class Adapter {
      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'post')
          let includes = snapshot.adapterOptions.include;

          return fetch(`./posts/${postId}?include=${includes}`)
            .then(response => response.json())
        }
      }

      static create() {
        return new this();
      }
    }
    ```

    In this case, the post's comments would then be available in your template as
    `model.comments`.

    Multiple relationships can be requested using an `include` parameter consisting of a
    list of relationship names, while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the post's
    comments and the authors of those comments the request would look like this:

    ```js [app/routes/post.js]
    export default class PostRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { include: ['comments','comments.author'] });
      }
    }
    ```

    ### Retrieving Specific Fields by Type

    If your server endpoint supports the use of a ['fields' query parameter](https://jsonapi.org/format/#fetching-sparse-fieldsets),
    you can use pass those fields through to your server.  At this point in time, this requires a few manual steps on your part.

    1. Implement `buildQuery` in your adapter.

    ```js [app/adapters/application.js]
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

    ```js [app/routes/post.js]
    export default class extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { adapterOptions: { fields: { post: 'body,title' } });
      }
    }
    ```

    Moreover, you can filter attributes on related models as well. If a `post` has a `belongsTo` relationship to a user,
    just include the relationship key and attributes.

    ```js [app/routes/post.js]
    export default class extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { adapterOptions: { fields: { post: 'body,title', user: 'name,email' } });
      }
    }
    ```

    @public
    @deprecated use {@link Store.request} instead
    @until 6.0
    @since 1.13.0
    @param type - either a string representing the name of the resource or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
    @param id - optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved
    @param options - if the first param is a string this will be the optional options for the request. See examples for available options.
  */
    findRecord<T>(type: TypeFromInstance<T>, id: string | number, options?: FindRecordOptions): Promise<T>;
    /** @deprecated */
    findRecord(type: string, id: string | number, options?: FindRecordOptions): Promise<unknown>;
    /** @deprecated */
    findRecord<T>(resource: ResourceIdentifierObject<TypeFromInstance<T>>, options?: FindRecordOptions): Promise<T>;
    /** @deprecated */
    findRecord(resource: ResourceIdentifierObject, options?: FindRecordOptions): Promise<unknown>;

    /**
    `findAll` asks the adapter's `findAll` method to find the records for the
    given type, and returns a promise which will resolve with all records of
    this type present in the store, even if the adapter only returns a subset
    of them.

    ```js [app/routes/authors.js]
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

    ```js [app/adapters/application.js]
    import { Adapter } from '@warp-drive/legacy/adapter';

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

    ```js [app/routes/post/edit.js]
    export default class PostEditRoute extends Route {
      model() {
        return this.store.findAll('post', { backgroundReload: false });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to you adapter via the `snapshotRecordArray`

    ```js [app/routes/posts.js]
    export default class PostsRoute extends Route {
      model(params) {
        return this.store.findAll('post', {
          adapterOptions: { subscribe: false }
        });
      }
    }
    ```

    ```js [app/adapters/post.js]
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

    If you use an adapter such as the default
    [JSONAPIAdapter](/api/@warp-drive/legacy/adapter/json-api/classes/JSONAPIAdapter)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findAll()` to automatically retrieve additional records related to
    those requested by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve all of the post records we can have the server also return
    all of the posts' comments in the same request:

    ```js [app/routes/posts.js]
    export default class PostsRoute extends Route {
      model() {
        return this.store.findAll('post', { include: ['comments'] });
      }
    }
    ```
    Multiple relationships can be requested using an `include` parameter consisting of a
    list or relationship names, while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the posts'
    comments and the authors of those comments the request would look like this:

    ```js [app/routes/posts.js]
    export default class PostsRoute extends Route {
      model() {
        return this.store.findAll('post', { include: ['comments','comments.author'] });
      }
    }
    ```

    See {@link Store.query | query} to only get a subset of records from the server.

    @public
    @deprecated use {@link Store.request} instead
    @until 6.0
    @since 1.13.0
    @param type the name of the resource
    @param options
  */
    findAll<T>(type: TypeFromInstance<T>, options?: FindAllOptions): Promise<LegacyLiveArray<T>>;
    /** @deprecated */
    findAll(type: string, options?: FindAllOptions): Promise<LegacyLiveArray>;

    /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Each time this method is called a new request is made through the adapter.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    ---

    If you do something like this:

    ```js
    store.query('person', { page: 1 });
    ```

    The request made to the server will look something like this:

    ```http
    GET "/api/v1/person?page=1"
    ```

    ---

    If you do something like this:

    ```js
    store.query('person', { ids: ['1', '2', '3'] });
    ```

    The request made to the server will look something like this:

    ```
    GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
    decoded: "/api/v1/person?ids[]=1&ids[]=2&ids[]=3"
    ```

    This method returns a promise, which is resolved with a
    {@link LegacyQueryArray} once the server returns.

    @public
    @deprecated use {@link Store.request} instead
    @until 6.0
    @since 1.13.0
    @param type the name of the resource
    @param query a query to be used by the adapter
    @param options optional, may include `adapterOptions` hash which will be passed to adapter.query
  */
    query<T>(
      type: TypeFromInstance<T>,
      query: LegacyResourceQuery,
      options?: QueryOptions
    ): Promise<LegacyQueryArray<T>>;
    /** @deprecated */
    query(type: string, query: LegacyResourceQuery, options?: QueryOptions): Promise<LegacyQueryArray>;

    /**
    This method makes a request for one record, where the `id` is not known
    beforehand (if the `id` is known, use {@link Store.findRecord | findRecord}
    instead).

    This method can be used when it is certain that the server will return a
    single object for the primary data.

    Each time this method is called a new request is made through the adapter.

    Let's assume our API provides an endpoint for the currently logged in user

    ```ts
    // GET /api/user/me
    {
      data: {
        type: 'user',
        id: '1234',
        attributes: {
          username: 'admin'
        }
      }
    }
    ```

    Since the specific `id` of the `user` is not known beforehand, we can use
    `queryRecord` to get the user:

    ```ts
    const user = await store.queryRecord('user', { me: true });
    user.username; // admin
    ```

    The request is made through the adapters' `queryRecord`:

    ```ts [app/adapters/user.ts]
    import Adapter from '@warp-drive/legacy/adapter';

    export default class UserAdapter extends Adapter {
      async queryRecord(modelName, query) {
        if (query.me) {
          const response = await fetch('/api/me');
          return await response.json();
        }
        throw new Error('Unsupported query');
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

    ```js
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

    ```js
    store.queryRecord('user', { username: 'unique' }).then(function(user) {
       // user is null
    });
    ```

    @public
    @deprecated use {@link Store.request} instead
    @until 6.0
    @since 1.13.0
    @param type
    @param query an opaque query to be used by the adapter
    @param options optional, may include `adapterOptions` hash which will be passed to adapter.queryRecord
    @return promise which resolves with the found record or `null`
  */
    queryRecord<T>(type: TypeFromInstance<T>, query: LegacyResourceQuery, options?: QueryOptions): Promise<T | null>;
    /** @deprecated */
    queryRecord(type: string, query: LegacyResourceQuery, options?: QueryOptions): Promise<unknown | null>;

    /**
    Get the reference for the specified record.

    Example

    ```javascript
    let userRef = store.getReference('user', '1');

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

    @public
    @deprecated use {@link Store.request} for loading and {@link Store.cache} for direct data insertion instead
    @until 6.0
    @since 2.5.0
    @param resource - modelName (string) or Identifier (object)
    @param id
  */
    getReference(resource: string | ResourceIdentifierObject, id: string | number): RecordReference;

    /**
    Returns the schema for a particular resource type (modelName).

    When used with [Model](/api/@warp-drive/legacy/model/classes/Model) the return is the model class,
    but this is not guaranteed.

    If looking to query attribute or relationship information it is
    recommended to use `getSchemaDefinitionService` instead. This method
    should be considered legacy and exists primarily to continue to support
    Adapter/Serializer APIs which expect it's return value in their method
    signatures.

    The class of a model might be useful if you want to get a list of all the
    relationship names of the model.

    @public
    @deprecated use {@link Store.schema} instead
    @until 6.0
    @param type
   */
    modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
    /** @deprecated */
    modelFor(type: string): ModelSchema;

    /**
     * Trigger a save for a Record.
     *
     * Returns a promise resolving with the same record when the save is complete.
     *
     * @deprecated use {@link Store.request} instead
     * @until 6.0
     * @public
     * @param record
     * @param options
     */
    saveRecord<T>(record: T, options?: Record<string, unknown>): Promise<T>;
  }
}

if (ENABLE_LEGACY_REQUEST_METHODS) {
  Store.prototype.findRecord = function (
    resource: string | ResourceIdentifierObject,
    id?: string | number | FindRecordOptions,
    options?: FindRecordOptions
  ): Promise<unknown> {
    deprecate(`store.findRecord is deprecated. Use store.request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });
    assert(
      `Attempted to call store.findRecord(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );

    assert(
      `You need to pass a modelName or resource identifier as the first argument to the store's findRecord method`,
      resource
    );
    if (isMaybeIdentifier(resource)) {
      options = id as FindRecordOptions | undefined;
    } else {
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${resource}`,
        typeof resource === 'string'
      );
      const type = normalizeModelName(resource);
      const normalizedId = ensureStringId(id as string | number);
      resource = constructResource(type, normalizedId);
    }

    const identifier = this.cacheKeyManager.getOrCreateRecordIdentifier(resource);
    options = options || {};

    if (options.preload) {
      // force reload if we preload to ensure we don't resolve the promise
      // until we are complete, else we will end up background-reloading
      // even for initial load.
      if (!this._instanceCache.recordIsLoaded(identifier)) {
        options.reload = true;
      }
      this._join(() => {
        preloadData(this, identifier, options.preload!);
      });
    }

    const promise = this.request<OpaqueRecordInstance>({
      op: 'findRecord',
      data: {
        record: identifier,
        options,
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => {
      return document.content;
    });
  };

  Store.prototype.findAll = function <T>(
    type: TypeFromInstance<T> | string,
    options: FindAllOptions = {}
  ): Promise<LegacyLiveArray<T>> {
    deprecate(`store.findAll is deprecated. Use store.request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });
    assert(
      `Attempted to call store.findAll(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`You need to pass a model name to the store's findAll method`, type);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    const promise = this.request<LegacyLiveArray<T>>({
      op: 'findAll',
      data: {
        type: normalizeModelName(type),
        options: options || {},
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => document.content);
  };

  Store.prototype.query = function (
    type: string,
    query: LegacyResourceQuery,
    options: QueryOptions = {}
  ): Promise<LegacyQueryArray> {
    deprecate(`store.query is deprecated. Use store.request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });
    assert(
      `Attempted to call store.query(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`You need to pass a model name to the store's query method`, type);
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    const promise = this.request<LegacyQueryArray>({
      op: 'query',
      data: {
        type: normalizeModelName(type),
        query,
        options: options,
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => document.content);
  };

  Store.prototype.queryRecord = function (
    type: string,
    query: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<OpaqueRecordInstance | null> {
    deprecate(`store.queryRecord is deprecated. Use store.request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });
    assert(
      `Attempted to call store.queryRecord(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`You need to pass a model name to the store's queryRecord method`, type);
    assert(`You need to pass a query hash to the store's queryRecord method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${type}`,
      typeof type === 'string'
    );

    const promise = this.request<OpaqueRecordInstance | null>({
      op: 'queryRecord',
      data: {
        type: normalizeModelName(type),
        query,
        options: options || {},
      },
      cacheOptions: { [SkipCache]: true },
    });

    return promise.then((document) => document.content);
  };

  Store.prototype.getReference = function (
    resource: string | ResourceIdentifierObject,
    id: string | number
  ): RecordReference {
    deprecate(
      `store.getReference is deprecated. There is no direct replacement. For working with the cache and relationships, use the cache with the appropriate identifiers. To load, use store.request.`,
      false,
      {
        id: 'warp-drive:deprecate-legacy-request-methods',
        until: '6.0',
        for: '@warp-drive/core',
        url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
        since: {
          enabled: '5.7',
          available: '5.7',
        },
      }
    );
    assert(
      `Attempted to call store.getReference(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );

    let resourceIdentifier: ResourceIdentifierObject;
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

    const identifier: ResourceKey = this.cacheKeyManager.getOrCreateRecordIdentifier(resourceIdentifier);

    const cache = upgradeInstanceCaches(this._instanceCache.__instances).reference;
    let reference = cache.get(identifier);

    if (!reference) {
      reference = new RecordReference(this, identifier);
      cache.set(identifier, reference);
    }
    return reference;
  };

  Store.prototype.modelFor = function <T>(
    type: T extends TypedRecordInstance ? TypeFromInstance<T> : string
  ): ModelSchema<T> {
    deprecate(
      `store.modelFor is deprecated, please use store.schema.fields({ type: '${type}' }) to access schema information instead.`,
      false,
      {
        id: 'warp-drive:deprecate-legacy-request-methods',
        until: '6.0',
        for: '@warp-drive/core',
        url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
        since: {
          enabled: '5.7',
          available: '5.7',
        },
      }
    );
    assert(`Attempted to call store.modelFor(), but the store instance has already been destroyed.`, !this.isDestroyed);
    assert(`You need to pass <type> to the store's modelFor method`, typeof type === 'string' && type.length);
    assert(`No model was found for '${type}' and no schema handles the type`, this.schema.hasResource({ type }));

    return getShimClass<T>(this, type);
  };

  Store.prototype.saveRecord = function <T>(record: T, options: Record<string, unknown> = {}): Promise<T> {
    deprecate(`store.saveRecord is deprecated, please use store.request to initiate a save request instead.`, false, {
      id: 'warp-drive:deprecate-legacy-request-methods',
      until: '6.0',
      for: '@warp-drive/core',
      url: 'https://docs.warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
      since: {
        enabled: '5.7',
        available: '5.7',
      },
    });
    assert(
      `Attempted to call store.saveRecord(), but the store instance has already been destroyed.`,
      !(this.isDestroying || this.isDestroyed)
    );
    assert(`Unable to initiate save for a record in a disconnected state`, storeFor(record, true));
    const identifier = recordIdentifierFor(record);
    const cache = this.cache;

    if (!identifier) {
      // this commonly means we're disconnected
      // but just in case we reject here to prevent bad things.
      return Promise.reject(new Error(`Record Is Disconnected`));
    }
    assert(
      `Cannot initiate a save request for an unloaded record: ${identifier.lid}`,
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
      records: [identifier],
      cacheOptions: { [SkipCache]: true },
    };

    return this.request<T>(request).then((document) => document.content);
  };
}

export { Store };

function upgradeInstanceCaches(cache: Caches): Caches & { reference: WeakMap<ResourceKey, RecordReference> } {
  const withReferences = cache as Caches & { reference: WeakMap<ResourceKey, RecordReference> };
  if (!withReferences.reference) {
    withReferences.reference = new WeakMap();
  }

  return withReferences;
}
