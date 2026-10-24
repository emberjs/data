---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/classes/ConfiguredStore.md
---

# &#x20;ConfiguredStore\<T *extends* { `cache`: [`Cache`](../types/cache/types/Cache.md); }, Policy *extends* [`CachePolicy`](../types/CachePolicy.md) = [`CachePolicy`](../types/CachePolicy.md)>

Defined in: [warp-drive-packages/core/src/index.ts:146](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/index.ts#L146)

```ts
import { Store } from '@warp-drive/core';
```

The `Store` is the central piece of the ***Warp*Drive** experience. It connects
requests for data with schemas, caching and reactivity.

While it's easy to use ***just*** ***Warp*Drive**'s request management, most projects will find they
require far more than basic fetch management. For this reason it's often best to start with a `Store`
even when you aren't sure yet.

Most projects will only have a single `Store`, though using multiple distinct stores
is possible.

## Extends

* [`Store`](Store.md)

## Type Parameters

### T

`T` *extends* {
`cache`: [`Cache`](../types/cache/types/Cache.md);
}

### Policy

`Policy` *extends* [`CachePolicy`](../types/CachePolicy.md) = [`CachePolicy`](../types/CachePolicy.md)

## Indexable

```ts
[key: string]: any
```

## Methods

### createCache()

```ts
createCache(capabilities: CacheCapabilitiesManager): T["cache"];
```

Defined in: [warp-drive-packages/core/src/index.ts:158](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/index.ts#L158)

Instantiation hook allowing applications or addons to configure the store
to utilize a custom Cache implementation.

This hook should not be called directly by consuming applications or libraries.
Use `Store.cache` to access the Cache instance.

#### Parameters

##### capabilities

[`CacheCapabilitiesManager`](../types/types/CacheCapabilitiesManager.md)

#### Returns

`T`\[`"cache"`]

#### Overrides

[`Store`](Store.md).[`createCache`](Store.md#createcache)

***

### createRecord()

#### Call Signature

```ts
createRecord<T>(
   type: TypeFromInstance<T>, 
   inputProperties: CreateRecordProperties<T>, 
   context?: CreateContext
): T;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1850](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1850)

Creates a new record in the current store.

> \[!CAUTION]
> This should not be used to mock records or to create
> a record representing data that could be fetched from
> the API.

The properties passed to this method are set on
the newly created record.

For instance: to create a new `post`:

```js
store.createRecord('post', {
  title: 'WarpDrive is Stellar!'
});
```

Relationships can be set during create. For instance,
to create a new `post` that has an existing user as
it's author:

```js
const user = store.peekRecord('user', '1');

store.createRecord('post', {
  title: 'WarpDrive is Stellar!',
  user: user
});
```

### lid handling

All new records are assigned an `lid` that can be used to handle
transactional saves of multiple records, or to link the data to
other data in scenarios involving eventual-consistency or remote
syncing.

```ts
const post = store.createRecord('post', {
  title: 'WarpDrive is Stellar!'
});
const { lid } = recordIdentifierFor(post);
```

The `lid` defaults to a uuidv4 string.

In order to support receiving knowledge about unpersisted creates
from other sources (say a different tab in the same web-browser),
createRecord allows for the `lid` to be provided as part of an
optional third argument. **If this lid already exists in the store
an error will be thrown.**

```ts
const post = store.createRecord(
  'post',
  { title: 'WarpDrive is Stellar!' },
  { lid: '4d47bb88-931f-496e-986d-c4888cef7373' }
);
```

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

the name of the resource

###### inputProperties

`CreateRecordProperties`<`T`>

a hash of properties to set on the
newly created record.

###### context?

`CreateContext`

##### Returns

`T`

a record in the "isNew" state

##### Inherited from

[`Store`](Store.md).[`createRecord`](Store.md#createrecord)

#### Call Signature

```ts
createRecord(
   type: string, 
   inputProperties: MaybeHasId & Partial<FilteredKeys<MaybeHasId & Record<string, unknown>>>, 
   context?: CreateContext
): unknown;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1851](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1851)

Creates a new record in the current store.

> \[!CAUTION]
> This should not be used to mock records or to create
> a record representing data that could be fetched from
> the API.

The properties passed to this method are set on
the newly created record.

For instance: to create a new `post`:

```js
store.createRecord('post', {
  title: 'WarpDrive is Stellar!'
});
```

Relationships can be set during create. For instance,
to create a new `post` that has an existing user as
it's author:

```js
const user = store.peekRecord('user', '1');

store.createRecord('post', {
  title: 'WarpDrive is Stellar!',
  user: user
});
```

### lid handling

All new records are assigned an `lid` that can be used to handle
transactional saves of multiple records, or to link the data to
other data in scenarios involving eventual-consistency or remote
syncing.

```ts
const post = store.createRecord('post', {
  title: 'WarpDrive is Stellar!'
});
const { lid } = recordIdentifierFor(post);
```

The `lid` defaults to a uuidv4 string.

In order to support receiving knowledge about unpersisted creates
from other sources (say a different tab in the same web-browser),
createRecord allows for the `lid` to be provided as part of an
optional third argument. **If this lid already exists in the store
an error will be thrown.**

```ts
const post = store.createRecord(
  'post',
  { title: 'WarpDrive is Stellar!' },
  { lid: '4d47bb88-931f-496e-986d-c4888cef7373' }
);
```

##### Parameters

###### type

`string`

the name of the resource

###### inputProperties

`MaybeHasId` & [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)<`FilteredKeys`<`MaybeHasId` & [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>>>

a hash of properties to set on the
newly created record.

###### context?

`CreateContext`

##### Returns

`unknown`

a record in the "isNew" state

##### Inherited from

[`Store`](Store.md).[`createRecord`](Store.md#createrecord)

***

### createSchemaService()

```ts
createSchemaService(): SchemaService;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:450](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L450)

This hook enables an app to supply a SchemaService
for use when information about a resource's schema needs
to be queried.

This method will only be called once to instantiate the singleton
service, which can then be accessed via `store.schema`.

For Example, to use the default SchemaService for ReactiveResource

```ts
import { SchemaService } from '@warp-drive/core/reactive';

class extends Store {
  createSchemaService() {
    return new SchemaService();
  }
}
```

Or to use the SchemaService for @warp-drive/legacy/model

```ts
import { buildSchema } from '@warp-drive/legacy/model';

class extends Store {
  createSchemaService() {
    return buildSchema(this);
  }
}
```

If you wish to chain services, you must either
instantiate each schema source directly or super to retrieve
an existing service. For convenience, when migrating from
`@warp-drive/legacy/model` to [ReactiveResource](../reactive/types/ReactiveResource.md) a
SchemaService is provided that handles this transition
for you:

```ts
import { DelegatingSchemaService } from '@warp-drive/legacy/model/migration-support';
import { SchemaService } from '@warp-drive/core/reactive';

class extends Store {
  createSchemaService() {
    const schema = new SchemaService();
    return new DelegatingSchemaService(this, schema);
  }
}
```

When using the DelegateSchemaService, the schema will first
be sourced from directly registered schemas, then will fallback
to sourcing a schema from available models if no schema is found.

#### Returns

[`SchemaService`](../types/schema/schema-service/types/SchemaService.md)

#### Inherited from

[`Store`](Store.md).[`createSchemaService`](Store.md#createschemaservice)

***

### deleteRecord()

```ts
deleteRecord<T>(record: T): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1935](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1935)

For symmetry, a record can be deleted via the store.

Example

```javascript
let post = store.createRecord('post', {
  title: 'Ember is awesome!'
});

store.deleteRecord(post);
```

#### Type Parameters

##### T

`T`

#### Parameters

##### record

`T`

#### Returns

`void`

#### Inherited from

[`Store`](Store.md).[`deleteRecord`](Store.md#deleterecord)

***

### ~~findAll()~~

#### Call Signature

```ts
findAll<T>(type: TypeFromInstance<T>, options?: BaseFinderOptions): Promise<LegacyLiveArray<T>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1140](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1140)

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

*When* the returned promise resolves depends on the reload behavior,
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

See [peekAll](Store.md#peekall) to get an array of current records in the
store, without waiting until a reload is finished.

### Retrieving Related Model Records&#x20;

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

See [query](Store.md#query) to only get a subset of records from the server.

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

the name of the resource

###### options?

`BaseFinderOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`LegacyLiveArray`](../reactive/types/LegacyLiveArray.md)<`T`>>

##### Deprecated

use [Store.request](Store.md#request) instead

##### Until

6.0

##### Inherited from

[`Store`](Store.md).[`findAll`](Store.md#findall)

#### Call Signature&#x20;

```ts
findAll(type: string, options?: BaseFinderOptions): Promise<LegacyLiveArray<unknown>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1142](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1142)

##### Parameters

###### type

`string`

###### options?

`BaseFinderOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`LegacyLiveArray`](../reactive/types/LegacyLiveArray.md)<`unknown`>>

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`findAll`](Store.md#findall)

***

### ~~findRecord()~~

#### Call Signature

```ts
findRecord<T>(
   type: TypeFromInstance<T>, 
   id: string | number, 
   options?: FindRecordOptions
): Promise<T>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:954](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L954)

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
in the store, it depends on the reload behavior *when* the returned promise
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

See [peekRecord](Store.md#peekrecord) to get the cached version of a record.

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

### Retrieving Specific Fields by Type&#x20;

```ts
findRecord(
   type: string, 
   id: string | number, 
   options?: FindRecordOptions
): Promise<unknown>;
findRecord<T>(resource: ResourceIdentifierObject<TypeFromInstance<T>>, options?: FindRecordOptions): Promise<T>;
findRecord(resource: ResourceIdentifierObject, options?: FindRecordOptions): Promise<unknown>;
```

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

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

either a string representing the name of the resource or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record

###### id

`string` | `number`

optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved

###### options?

`FindRecordOptions`

if the first param is a string this will be the optional options for the request. See examples for available options.

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>

##### Deprecated

use [Store.request](Store.md#request) instead

##### Until

6.0

##### Inherited from

[`Store`](Store.md).[`findRecord`](Store.md#findrecord)

#### Call Signature&#x20;

```ts
findRecord(
   type: string, 
   id: string | number, 
   options?: FindRecordOptions
): Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:956](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L956)

##### Parameters

###### type

`string`

###### id

`string` | `number`

###### options?

`FindRecordOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`findRecord`](Store.md#findrecord)

#### Call Signature&#x20;

```ts
findRecord<T>(resource: ResourceIdentifierObject<TypeFromInstance<T>>, options?: FindRecordOptions): Promise<T>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:958](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L958)

##### Type Parameters

###### T

`T`

##### Parameters

###### resource

[`ResourceIdentifierObject`](../types/spec/json-api-raw/types/ResourceIdentifierObject.md)<[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>>

###### options?

`FindRecordOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`findRecord`](Store.md#findrecord)

#### Call Signature&#x20;

```ts
findRecord(resource: ResourceIdentifierObject, options?: FindRecordOptions): Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:960](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L960)

##### Parameters

###### resource

[`ResourceIdentifierObject`](../types/spec/json-api-raw/types/ResourceIdentifierObject.md)

###### options?

`FindRecordOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`findRecord`](Store.md#findrecord)

***

### ~~getReference()~~&#x20;

```ts
getReference(resource: 
  | string
  | ResourceIdentifierObject, id: string | number): RecordReference;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1342](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1342)

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

#### Parameters

##### resource

| `string`
| [`ResourceIdentifierObject`](../types/spec/json-api-raw/types/ResourceIdentifierObject.md)

modelName (string) or Identifier (object)

##### id

`string` | `number`

#### Returns

`RecordReference`

#### Deprecated

use [Store.request](Store.md#request) for loading and [Store.cache](Store.md#cache) for direct data insertion instead

#### Until

6.0

#### Inherited from

[`Store`](Store.md).[`getReference`](Store.md#getreference)

***

### getRequestStateService()

```ts
getRequestStateService(): RequestStateService;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1643](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1643)

Retrieve the RequestStateService instance
associated with this Store.

This can be used to query the status of requests
that have been initiated for a given identifier.

#### Returns

`RequestStateService`

#### Inherited from

[`Store`](Store.md).[`getRequestStateService`](Store.md#getrequeststateservice)

***

### ~~getSchemaDefinitionService()~~&#x20;

```ts
getSchemaDefinitionService(): SchemaService;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:464](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L464)

DEPRECATED - Use the property `store.schema` instead.

Provides access to the SchemaDefinitionService instance
for this Store instance.

The SchemaDefinitionService can be used to query for
information about the schema of a resource.

#### Returns

[`SchemaService`](../types/schema/schema-service/types/SchemaService.md)

#### Deprecated

#### Inherited from

[`Store`](Store.md).[`getSchemaDefinitionService`](Store.md#getschemadefinitionservice)

***

### instantiateRecord()

```ts
instantiateRecord<T>(identifier: ResourceKey, createRecordArgs: {
  [key: string]: unknown;
}): unknown;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:380](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L380)

A hook which an app or addon may implement. Called when
the Store is attempting to create a Record Instance for
a resource.

This hook can be used to select or instantiate any desired
mechanism of presenting cache data to the ui for access
mutation, and interaction.

#### Type Parameters

##### T

`T`

#### Parameters

##### identifier

[`ResourceKey`](../types/identifier/types/ResourceKey.md)

The Resource CacheKey

##### createRecordArgs

An object containing any properties passed to `store.createRecord`

#### Returns

`unknown`

A record instance

#### Inherited from

[`Store`](Store.md).[`instantiateRecord`](Store.md#instantiaterecord)

***

### ~~modelFor()~~

```ts
modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
modelFor(type: string): ModelSchema;
```

#### Call Signature&#x20;

```ts
modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1364](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1364)

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

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

##### Returns

[`ModelSchema`](../types/types/ModelSchema.md)<`T`>

##### Deprecated

use [Store.schema](Store.md#schema) instead

##### Until

6.0

##### Inherited from

[`Store`](Store.md).[`modelFor`](Store.md#modelfor)

#### Call Signature&#x20;

```ts
modelFor(type: string): ModelSchema;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1366](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1366)

##### Parameters

###### type

`string`

##### Returns

[`ModelSchema`](../types/types/ModelSchema.md)

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`modelFor`](Store.md#modelfor)

***

### peekAll()

```ts
peekAll<T>(type: TypeFromInstance<T>): LegacyLiveArray<T>;
peekAll(type: string): LegacyLiveArray;
```

#### Call Signature

```ts
peekAll<T>(type: TypeFromInstance<T>): LegacyLiveArray<T>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2071](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2071)

This method returns the [LegacyLiveArray](../reactive/types/LegacyLiveArray.md) that contains all of the
known records for a given type in the store. Each ResourceType has only
one LiveArray instance, so multiple calls to `peekAll` with the same type
will always return the same instance.

Note that because it's a LiveArray, the result will contain any
locally created records of the type, however, it will not make a
request to the backend to retrieve additional records.

Example

```ts
const allPosts = store.peekAll('post');
```

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

the name of the resource

##### Returns

[`LegacyLiveArray`](../reactive/types/LegacyLiveArray.md)<`T`>

##### Inherited from

[`Store`](Store.md).[`peekAll`](Store.md#peekall)

#### Call Signature

```ts
peekAll(type: string): LegacyLiveArray;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2072](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2072)

This method returns the [LegacyLiveArray](../reactive/types/LegacyLiveArray.md) that contains all of the
known records for a given type in the store. Each ResourceType has only
one LiveArray instance, so multiple calls to `peekAll` with the same type
will always return the same instance.

Note that because it's a LiveArray, the result will contain any
locally created records of the type, however, it will not make a
request to the backend to retrieve additional records.

Example

```ts
const allPosts = store.peekAll('post');
```

##### Parameters

###### type

`string`

the name of the resource

##### Returns

[`LegacyLiveArray`](../reactive/types/LegacyLiveArray.md)

##### Inherited from

[`Store`](Store.md).[`peekAll`](Store.md#peekall)

***

### peekRecord()

```ts
peekRecord<T>(type: TypeFromInstance<T>, id: string | number): T | null;
peekRecord(type: string, id: string | number): unknown;
peekRecord<T>(identifier: ResourceIdentifierObject<TypeFromInstance<T>>): T | null;
peekRecord(identifier: ResourceIdentifierObject): unknown;
```

#### Call Signature

```ts
peekRecord<T>(type: TypeFromInstance<T>, id: string | number): T | null;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2017](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2017)

Get a record by a given type and ID without triggering a fetch.

This method will synchronously return the record if it is available in the store,
otherwise it will return `null`. A record is available if it has been fetched earlier, or
pushed manually into the store.

**Example 1**

```ts
const post = store.peekRecord('post', '1');

post.id; // '1'
```

`peekRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

**Example 2**

```ts
const post = store.peekRecord({ type: 'post', id: '1' });
post.id; // '1'
```

If you have previously received an lid from an Identifier for this record, you can lookup the record again using
just the lid.

**Example 3**

```js
let post = store.peekRecord({ lid });
post.id; // '1'
```

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

either a string representing the modelName or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record

###### id

`string` | `number`

optional only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved.

##### Returns

`T` | `null`

##### Inherited from

[`Store`](Store.md).[`peekRecord`](Store.md#peekrecord)

#### Call Signature

```ts
peekRecord(type: string, id: string | number): unknown;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2018](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2018)

Get a record by a given type and ID without triggering a fetch.

This method will synchronously return the record if it is available in the store,
otherwise it will return `null`. A record is available if it has been fetched earlier, or
pushed manually into the store.

**Example 1**

```ts
const post = store.peekRecord('post', '1');

post.id; // '1'
```

`peekRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

**Example 2**

```ts
const post = store.peekRecord({ type: 'post', id: '1' });
post.id; // '1'
```

If you have previously received an lid from an Identifier for this record, you can lookup the record again using
just the lid.

**Example 3**

```js
let post = store.peekRecord({ lid });
post.id; // '1'
```

##### Parameters

###### type

`string`

either a string representing the modelName or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record

###### id

`string` | `number`

optional only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved.

##### Returns

`unknown`

##### Inherited from

[`Store`](Store.md).[`peekRecord`](Store.md#peekrecord)

#### Call Signature

```ts
peekRecord<T>(identifier: ResourceIdentifierObject<TypeFromInstance<T>>): T | null;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2019](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2019)

Get a record by a given type and ID without triggering a fetch.

This method will synchronously return the record if it is available in the store,
otherwise it will return `null`. A record is available if it has been fetched earlier, or
pushed manually into the store.

**Example 1**

```ts
const post = store.peekRecord('post', '1');

post.id; // '1'
```

`peekRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

**Example 2**

```ts
const post = store.peekRecord({ type: 'post', id: '1' });
post.id; // '1'
```

If you have previously received an lid from an Identifier for this record, you can lookup the record again using
just the lid.

**Example 3**

```js
let post = store.peekRecord({ lid });
post.id; // '1'
```

##### Type Parameters

###### T

`T`

##### Parameters

###### identifier

[`ResourceIdentifierObject`](../types/spec/json-api-raw/types/ResourceIdentifierObject.md)<[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>>

##### Returns

`T` | `null`

##### Inherited from

[`Store`](Store.md).[`peekRecord`](Store.md#peekrecord)

#### Call Signature

```ts
peekRecord(identifier: ResourceIdentifierObject): unknown;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2020](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2020)

Get a record by a given type and ID without triggering a fetch.

This method will synchronously return the record if it is available in the store,
otherwise it will return `null`. A record is available if it has been fetched earlier, or
pushed manually into the store.

**Example 1**

```ts
const post = store.peekRecord('post', '1');

post.id; // '1'
```

`peekRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

**Example 2**

```ts
const post = store.peekRecord({ type: 'post', id: '1' });
post.id; // '1'
```

If you have previously received an lid from an Identifier for this record, you can lookup the record again using
just the lid.

**Example 3**

```js
let post = store.peekRecord({ lid });
post.id; // '1'
```

##### Parameters

###### identifier

[`ResourceIdentifierObject`](../types/spec/json-api-raw/types/ResourceIdentifierObject.md)

##### Returns

`unknown`

##### Inherited from

[`Store`](Store.md).[`peekRecord`](Store.md#peekrecord)

***

### push()

```ts
push(data: EmptyResourceDocument): null;
push<T>(data: SingleResourceDocument<TypeFromInstance<T>>): T;
push(data: SingleResourceDocument): unknown;
push<T>(data: CollectionResourceDocument<TypeFromInstance<T>>): T[];
push(data: CollectionResourceDocument): unknown[];
```

#### Call Signature

```ts
push(data: EmptyResourceDocument): null;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2278](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2278)

Push some data for a given type into the store.

This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:

* record's `type` should always be in singular, dasherized form
* members (properties) should be camelCased

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
  * [`links`](http://jsonapi.org/format/#document-links)
  * [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
  * [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

For this model:

```js [app/models/person.js]
import Model, { attr, hasMany } from '@warp-drive/legacy/model';

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

If you're streaming data, or implementing response handling, make sure
that you have converted the incoming data into this form.

This method can be used both to push in brand new
records, as well as to update existing records.

See also [Cache.patch](../types/cache/types/Cache.md#patch)

##### Parameters

###### data

[`EmptyResourceDocument`](../types/spec/json-api-raw/types/EmptyResourceDocument.md)

##### Returns

`null`

the primary record(s) that created or updated.

##### Inherited from

[`Store`](Store.md).[`push`](Store.md#push)

#### Call Signature

```ts
push<T>(data: SingleResourceDocument<TypeFromInstance<T>>): T;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2279](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2279)

Push some data for a given type into the store.

This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:

* record's `type` should always be in singular, dasherized form
* members (properties) should be camelCased

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
  * [`links`](http://jsonapi.org/format/#document-links)
  * [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
  * [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

For this model:

```js [app/models/person.js]
import Model, { attr, hasMany } from '@warp-drive/legacy/model';

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

If you're streaming data, or implementing response handling, make sure
that you have converted the incoming data into this form.

This method can be used both to push in brand new
records, as well as to update existing records.

See also [Cache.patch](../types/cache/types/Cache.md#patch)

##### Type Parameters

###### T

`T`

##### Parameters

###### data

[`SingleResourceDocument`](../types/spec/json-api-raw/types/SingleResourceDocument.md)<[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>>

##### Returns

`T`

the primary record(s) that created or updated.

##### Inherited from

[`Store`](Store.md).[`push`](Store.md#push)

#### Call Signature

```ts
push(data: SingleResourceDocument): unknown;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2280](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2280)

Push some data for a given type into the store.

This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:

* record's `type` should always be in singular, dasherized form
* members (properties) should be camelCased

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
  * [`links`](http://jsonapi.org/format/#document-links)
  * [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
  * [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

For this model:

```js [app/models/person.js]
import Model, { attr, hasMany } from '@warp-drive/legacy/model';

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

If you're streaming data, or implementing response handling, make sure
that you have converted the incoming data into this form.

This method can be used both to push in brand new
records, as well as to update existing records.

See also [Cache.patch](../types/cache/types/Cache.md#patch)

##### Parameters

###### data

[`SingleResourceDocument`](../types/spec/json-api-raw/types/SingleResourceDocument.md)

##### Returns

`unknown`

the primary record(s) that created or updated.

##### Inherited from

[`Store`](Store.md).[`push`](Store.md#push)

#### Call Signature

```ts
push<T>(data: CollectionResourceDocument<TypeFromInstance<T>>): T[];
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2281](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2281)

Push some data for a given type into the store.

This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:

* record's `type` should always be in singular, dasherized form
* members (properties) should be camelCased

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
  * [`links`](http://jsonapi.org/format/#document-links)
  * [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
  * [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

For this model:

```js [app/models/person.js]
import Model, { attr, hasMany } from '@warp-drive/legacy/model';

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

If you're streaming data, or implementing response handling, make sure
that you have converted the incoming data into this form.

This method can be used both to push in brand new
records, as well as to update existing records.

See also [Cache.patch](../types/cache/types/Cache.md#patch)

##### Type Parameters

###### T

`T`

##### Parameters

###### data

[`CollectionResourceDocument`](../types/spec/json-api-raw/types/CollectionResourceDocument.md)<[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>>

##### Returns

`T`\[]

the primary record(s) that created or updated.

##### Inherited from

[`Store`](Store.md).[`push`](Store.md#push)

#### Call Signature

```ts
push(data: CollectionResourceDocument): unknown[];
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2282](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2282)

Push some data for a given type into the store.

This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:

* record's `type` should always be in singular, dasherized form
* members (properties) should be camelCased

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
  * [`links`](http://jsonapi.org/format/#document-links)
  * [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
  * [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

For this model:

```js [app/models/person.js]
import Model, { attr, hasMany } from '@warp-drive/legacy/model';

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

If you're streaming data, or implementing response handling, make sure
that you have converted the incoming data into this form.

This method can be used both to push in brand new
records, as well as to update existing records.

See also [Cache.patch](../types/cache/types/Cache.md#patch)

##### Parameters

###### data

[`CollectionResourceDocument`](../types/spec/json-api-raw/types/CollectionResourceDocument.md)

##### Returns

`unknown`\[]

the primary record(s) that created or updated.

##### Inherited from

[`Store`](Store.md).[`push`](Store.md#push)

***

### ~~query()~~

```ts
query<T>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<LegacyQueryArray<T>>;
query(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<LegacyQueryArray<unknown>>;
```

#### Call Signature&#x20;

```ts
query<T>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<LegacyQueryArray<T>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1194](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1194)

This method delegates a query to the adapter. This is the one place where
adapter-level semantics are exposed to the application.

Each time this method is called a new request is made through the adapter.

Exposing queries this way seems preferable to creating an abstract query
language for all server-side queries, and then require all adapters to
implement them.

***

If you do something like this:

```js
store.query('person', { page: 1 });
```

The request made to the server will look something like this:

```http
GET "/api/v1/person?page=1"
```

***

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
[LegacyQueryArray](../reactive/types/LegacyQueryArray.md) once the server returns.

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

the name of the resource

###### query

`LegacyResourceQuery`

a query to be used by the adapter

###### options?

`QueryOptions`

optional, may include `adapterOptions` hash which will be passed to adapter.query

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`LegacyQueryArray`](../reactive/types/LegacyQueryArray.md)<`T`>>

##### Deprecated

use [Store.request](Store.md#request) instead

##### Until

6.0

##### Inherited from

[`Store`](Store.md).[`query`](Store.md#query)

#### Call Signature&#x20;

```ts
query(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<LegacyQueryArray<unknown>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1196](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1196)

##### Parameters

###### type

`string`

###### query

`LegacyResourceQuery`

###### options?

`QueryOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`LegacyQueryArray`](../reactive/types/LegacyQueryArray.md)<`unknown`>>

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`query`](Store.md#query)

***

### ~~queryRecord()~~

```ts
queryRecord<T>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<T | null>;
queryRecord(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<unknown>;
```

#### Call Signature&#x20;

```ts
queryRecord<T>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<T | null>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1300](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1300)

This method makes a request for one record, where the `id` is not known
beforehand (if the `id` is known, use [findRecord](Store.md#findrecord)
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

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

###### query

`LegacyResourceQuery`

an opaque query to be used by the adapter

###### options?

`QueryOptions`

optional, may include `adapterOptions` hash which will be passed to adapter.queryRecord

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T` | `null`>

promise which resolves with the found record or `null`

##### Deprecated

use [Store.request](Store.md#request) instead

##### Until

6.0

##### Inherited from

[`Store`](Store.md).[`queryRecord`](Store.md#queryrecord)

#### Call Signature&#x20;

```ts
queryRecord(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): Promise<unknown>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1302](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1302)

##### Parameters

###### type

`string`

###### query

`LegacyResourceQuery`

###### options?

`QueryOptions`

##### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

##### Deprecated

##### Inherited from

[`Store`](Store.md).[`queryRecord`](Store.md#queryrecord)

***

### ~~registerSchema()~~&#x20;

```ts
registerSchema(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:572](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L572)

DEPRECATED - Use `createSchemaService` instead.

Allows an app to register a custom SchemaService
for use when information about a resource's schema needs
to be queried.

This method can only be called more than once, but only one schema
definition service may exist. Therefore if you wish to chain services
you must lookup the existing service and close over it with the new
service by accessing `store.schema` prior to registration.

For Example:

```ts
import { Store } from '@warp-drive/core';

class SchemaDelegator {
  constructor(schema) {
    this._schema = schema;
  }

  hasResource(resource: { type: string }): boolean {
    if (AbstractSchemas.has(resource.type)) {
      return true;
    }
    return this._schema.hasResource(resource);
  }

  attributesDefinitionFor(identifier: ResourceKey | { type: string }): AttributesSchema {
    return this._schema.attributesDefinitionFor(identifier);
  }

  relationshipsDefinitionFor(identifier: ResourceKey | { type: string }): RelationshipsSchema {
    const schema = AbstractSchemas.get(identifier.type);
    return schema || this._schema.relationshipsDefinitionFor(identifier);
  }
}

export default class extends Store {
  constructor(...args) {
    super(...args);

    const schema = this.schema;
    this.registerSchema(new SchemaDelegator(schema));
  }
}
```

#### Parameters

##### schema

[`SchemaService`](../types/schema/schema-service/types/SchemaService.md)

#### Returns

`void`

#### Deprecated

#### Inherited from

[`Store`](Store.md).[`registerSchema`](Store.md#registerschema)

***

### ~~registerSchemaDefinitionService()~~&#x20;

```ts
registerSchemaDefinitionService(schema: SchemaService): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:518](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L518)

DEPRECATED - Use `createSchemaService` instead.

Allows an app to register a custom SchemaService
for use when information about a resource's schema needs
to be queried.

This method can only be called more than once, but only one schema
definition service may exist. Therefore if you wish to chain services
you must lookup the existing service and close over it with the new
service by accessing `store.schema` prior to registration.

For Example:

```ts
import { Store } from '@warp-drive/core';

class SchemaDelegator {
  constructor(schema) {
    this._schema = schema;
  }

  hasResource(resource: { type: string }): boolean {
    if (AbstractSchemas.has(resource.type)) {
      return true;
    }
    return this._schema.hasResource(resource);
  }

  attributesDefinitionFor(identifier: ResourceKey | { type: string }): AttributesSchema {
    return this._schema.attributesDefinitionFor(identifier);
  }

  relationshipsDefinitionFor(identifier: ResourceKey | { type: string }): RelationshipsSchema {
    const schema = AbstractSchemas.get(identifier.type);
    return schema || this._schema.relationshipsDefinitionFor(identifier);
  }
}

export default class extends Store {
  constructor(...args) {
    super(...args);

    const schema = this.createSchemaService();
    this.registerSchemaDefinitionService(new SchemaDelegator(schema));
  }
}
```

#### Parameters

##### schema

[`SchemaService`](../types/schema/schema-service/types/SchemaService.md)

#### Returns

`void`

#### Deprecated

#### Inherited from

[`Store`](Store.md).[`registerSchemaDefinitionService`](Store.md#registerschemadefinitionservice)

***

### request()

```ts
request<RT>(requestConfig: StoreRequestInput<RT>): Future<RT>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1718](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1718)

::: tip 💡 For a more complete overview see the [Request Guide](/guides/2-requests/1-overview)
:::

Issue a request via the configured [RequestManager](RequestManager.md),
inserting the response into the [cache](Store.md#cache) and handing
back a [Future](../request/types/Future.md) which resolves to a [ReactiveDocument](../reactive/types/ReactiveDocument.md)

#### Request Cache Keys

Only [GET](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/GET) requests with a url or requests with an explicit
[cache key](../types/request/types/CacheOptions.md#key) will have the request result
and document cached.

The cache key used is RequestInfo.cacheOptions.key | RequestInfo.cacheOptions.key
if present, falling back to [RequestInfo.url](../types/request/types/RequestInfo.md#url).

Params are not serialized as part of the cache-key, so
either ensure they are already in the url or utilize
`requestConfig.cacheOptions.key`. For queries issued
via the [POST](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST) method `requestConfig.cacheOptions.key`
MUST be supplied for the document to be cached.

#### Requesting Without a Cache Key

Resource data within the request is always updated in the cache,
regardless of whether a cache key is present for the request.

#### Fulfilling From Cache

When a cache-key is determined, the request may fulfill
from cache provided the cache is not stale.

Cache staleness is determined by the configured [CachePolicy](../types/CachePolicy.md)
with priority given to the  [CacheOptions.reload](../types/request/types/CacheOptions.md#reload) and
[CacheOptions.backgroundReload](../types/request/types/CacheOptions.md#backgroundreload) on the request if present.

If the cache data has soft expired or the request asks for a background
reload, the request will fulfill from cache if possible and
make a non-blocking request in the background to update the cache.

If the cache data has hard expired or the request asks for a reload,
the request will not fulfill from cache and will make a blocking
request to update the cache.

#### The Response

The primary difference between [RequestManager.request](RequestManager.md#request) and `store.request`
is that `store.request` will convert the response into a [ReactiveDocument](../reactive/types/ReactiveDocument.md)
containing [ReactiveResources](Store.md#instantiaterecord).

#### Type Parameters

##### RT

`RT`

#### Parameters

##### requestConfig

[`StoreRequestInput`](../types/StoreRequestInput.md)<`RT`>

#### Returns

[`Future`](../request/types/Future.md)<`RT`>

#### Inherited from

[`Store`](Store.md).[`request`](Store.md#request)

***

### ~~saveRecord()~~&#x20;

```ts
saveRecord<T>(record: T, options?: Record<string, unknown>): Promise<T>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1379](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1379)

Trigger a save for a Record.

Returns a promise resolving with the same record when the save is complete.

#### Type Parameters

##### T

`T`

#### Parameters

##### record

`T`

##### options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>

#### Deprecated

use [Store.request](Store.md#request) instead

#### Until

6.0

#### Inherited from

[`Store`](Store.md).[`saveRecord`](Store.md#saverecord)

***

### teardownRecord()

```ts
teardownRecord(record: unknown): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:391](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L391)

A hook which an app or addon may implement. Called when
the Store is destroying a Record Instance. This hook should
be used to teardown any custom record instances instantiated
with `instantiateRecord`.

#### Parameters

##### record

`unknown`

#### Returns

`void`

#### Inherited from

[`Store`](Store.md).[`teardownRecord`](Store.md#teardownrecord)

***

### unloadAll()

```ts
unloadAll<T>(type: TypeFromInstance<T>): void;
unloadAll(type?: string): void;
```

#### Call Signature

```ts
unloadAll<T>(type: TypeFromInstance<T>): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2100](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2100)

This method unloads all records in the store.
It schedules unloading to happen during the next run loop.

Optionally you can pass a type which unload all records for a given type.

```javascript
store.unloadAll();
store.unloadAll('post');
```

##### Type Parameters

###### T

`T`

##### Parameters

###### type

[`TypeFromInstance`](../types/record/types/TypeFromInstance.md)<`T`>

the name of the resource

##### Returns

`void`

##### Inherited from

[`Store`](Store.md).[`unloadAll`](Store.md#unloadall)

#### Call Signature

```ts
unloadAll(type?: string): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2101](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2101)

This method unloads all records in the store.
It schedules unloading to happen during the next run loop.

Optionally you can pass a type which unload all records for a given type.

```javascript
store.unloadAll();
store.unloadAll('post');
```

##### Parameters

###### type?

`string`

the name of the resource

##### Returns

`void`

##### Inherited from

[`Store`](Store.md).[`unloadAll`](Store.md#unloadall)

***

### unloadRecord()

```ts
unloadRecord<T>(record: T): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1966](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1966)

For symmetry, a record can be unloaded via the store.
This will cause the record to be destroyed and freed up for garbage collection.

Example

```javascript
const { content: { data: post } } = await store.request(findRecord({ type: 'post', id: '1' }));
store.unloadRecord(post);
```

#### Type Parameters

##### T

`T`

#### Parameters

##### record

`T`

#### Returns

`void`

#### Inherited from

[`Store`](Store.md).[`unloadRecord`](Store.md#unloadrecord)

## Properties

### cacheKeyManager

```ts
readonly cacheKeyManager: CacheKeyManager;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1443](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1443)

Provides access to the CacheKeyManager
for this store.

The CacheKeyManager can be used to generate or
retrieve a stable unique CacheKey for any resource
or request.

#### Inherited from

[`Store`](Store.md).[`cacheKeyManager`](Store.md#cachekeymanager)

***

### lifetimes

```ts
lifetimes: Policy;
```

Defined in: [warp-drive-packages/core/src/index.ts:156](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/index.ts#L156)

A Property which an App may set to provide a CachePolicy
to control when a cached request becomes stale.

Note, when defined, these methods will only be invoked if a
cache key exists for the request, either because the request
contains `cacheOptions.key` or because the CacheKeyManager
was able to generate a key for the request using the configured
[generation method](../functions/setIdentifierGenerationMethod.md).

`isSoftExpired` will only be invoked if `isHardExpired` returns `false`.

```ts
store.lifetimes = {
  // make the request and ignore the current cache state
  isHardExpired(key: RequestKey): boolean {
    return false;
  }

  // make the request in the background if true, return cache state
  isSoftExpired(key: RequestKey): boolean {
    return false;
  }
}
```

#### Overrides

[`Store`](Store.md).[`lifetimes`](Store.md#lifetimes)

***

### notifications

```ts
readonly notifications: NotificationManager;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1413](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1413)

Provides access to the [NotificationManager](../store/types/NotificationManager.md) associated
with this Store instance.

The NotificationManager can be used to subscribe to
changes to the cache.

#### Inherited from

[`Store`](Store.md).[`notifications`](Store.md#notifications)

***

### requestManager

```ts
requestManager: RequestManager;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1465](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1465)

Provides access to the [RequestManager](RequestManager.md) instance associated
with this Store instance.

See also:

* [Fetch](../variables/Fetch.md)
* [CacheHandler (Interface)](../request/types/CacheHandler.md)
* [CacheHandler (Class)](../variables/CacheHandler.md)

```ts
import { CacheHandler, Fetch, RequestManager, Store } from '@warp-drive/core';

class AppStore extends Store {
  requestManager = new RequestManager()
   .use([Fetch])
   .useCache(CacheHandler);
}
```

#### Inherited from

[`Store`](Store.md).[`requestManager`](Store.md#requestmanager)

### cache

#### Get Signature

```ts
get cache(): ReturnType<this["createCache"]>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:2331](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L2331)

Returns the cache instance associated to this Store, instantiates the Cache
if necessary via `Store.createCache`

##### Returns

[`ReturnType`](https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypetype)<`this`\[`"createCache"`]>

#### Inherited from

[`Store`](Store.md).[`cache`](Store.md#cache)

***

### identifierCache

#### Get Signature&#x20;

```ts
get identifierCache(): CacheKeyManager;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1548](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1548)

##### Deprecated

use [Store.cacheKeyManager](#cachekeymanager)

##### Returns

`CacheKeyManager`

#### Inherited from

[`Store`](Store.md).[`identifierCache`](Store.md#identifiercache)

***

### schema

#### Get Signature

```ts
get schema(): ReturnType<this["createSchemaService"]>;
```

Defined in: [warp-drive-packages/core/src/store/-private/store-service.ts:1424](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/store-service.ts#L1424)

Provides access to the SchemaService instance
for this Store instance.

The SchemaService can be used to query for
information about the schema of a resource.

##### Returns

[`ReturnType`](https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypetype)<`this`\[`"createSchemaService"`]>

#### Inherited from

[`Store`](Store.md).[`schema`](Store.md#schema)
