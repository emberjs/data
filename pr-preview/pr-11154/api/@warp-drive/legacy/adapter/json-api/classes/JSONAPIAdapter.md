---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/adapter/json-api/classes/JSONAPIAdapter.md
---

&#x20;

# &#x20;JSONAPIAdapter&#x20;

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:156](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L156)

## Overview

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../../../core/classes/RequestManager.md)
:::

The `JSONAPIAdapter` is an adapter whichtransforms the store's
requests into HTTP requests that follow the [JSON API format](http://jsonapi.org/format/).

## JSON API Conventions

The JSONAPIAdapter uses JSON API conventions for building the URL
for a record and selecting the HTTP verb to use with a request. The
actions you can take on a record map onto the following URLs in the
JSON API adapter:

## Success and failure

The JSONAPIAdapter will consider a success any response with a
status code of the 2xx family ("Success"), as well as 304 ("Not
Modified"). Any other status code will be considered a failure.

On success, the request promise will be resolved with the full
response payload.

Failed responses with status code 422 ("Unprocessable Entity") will
be considered "invalid". The response will be discarded, except for
the `errors` key. The request promise will be rejected with a
`InvalidError`. This error object will encapsulate the saved
`errors` value.

Any other status codes will be treated as an adapter error. The
request promise will be rejected, similarly to the invalid case,
but with an instance of `AdapterError` instead.

### Endpoint path customization

Endpoint paths can be prefixed with a `namespace` by setting the
namespace property on the adapter:

```js [app/adapters/application.js]
import { JSONAPIAdapter } from '@warp-drive/legacy/adapter/json-api';

export default class ApplicationAdapter extends JSONAPIAdapter {
  namespace = 'api/1';
}
```

Requests for the `person` model would now target `/api/1/people/1`.

### Host customization

An adapter can target other hosts by setting the `host` property.

```js [app/adapters/application.js]
import JSONAPIAdapter from '@warp-drive/legacy/adapter/json-api';

export default class ApplicationAdapter extends JSONAPIAdapter {
  host = 'https://api.example.com';
}
```

Requests for the `person` model would now target
`https://api.example.com/people/1`.

## Extends

* [`RESTAdapter`](../../rest/classes/RESTAdapter.md)

## Constructors

### Constructor

```ts
new JSONAPIAdapter(owner?: Owner): JSONAPIAdapter;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:122](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L122)

#### Parameters

##### owner?

`Owner`

#### Returns

`JSONAPIAdapter`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`constructor`](../../rest/classes/RESTAdapter.md#constructor)

## Methods

### buildQuery()

```ts
buildQuery(snapshot: Snapshot<unknown> | SnapshotRecordArray): QueryState;
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:287](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L287)

Used by `findAll` and `findRecord` to build the query's `data` hash
supplied to the ajax method.

#### Parameters

##### snapshot

`Snapshot`<`unknown`> | `SnapshotRecordArray`

#### Returns

[`QueryState`](../../rest/types/QueryState.md)

#### Overrides

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildQuery`](../../rest/classes/RESTAdapter.md#buildquery)

***

### buildURL()

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: SnapshotRecordArray, 
   requestType: "findAll"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "query", 
   query: Record<string, unknown>
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "queryRecord", 
   query: Record<string, unknown>
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string[], 
   snapshot: Snapshot<unknown>[], 
   requestType: "findMany"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findHasMany"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findBelongsTo"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string | null, 
   snapshot: Snapshot, 
   requestType: "createRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "updateRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "deleteRecord"
): string;
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot
): string;
```

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:41](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L41)

Builds a URL for a given type and optional ID.

By default, it pluralizes the type's name (for example, 'post'
becomes 'posts' and 'person' becomes 'people'). To override the
pluralization see [pathForType](../../types/BuildURLMixin.md#pathfortype).

If an ID is specified, it adds the ID to the path generated
for the type, separated by a `/`.

This overload builds the URL for a `store.findRecord(type, id)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"findRecord"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: SnapshotRecordArray, 
   requestType: "findAll"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:53](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L53)

Builds the URL for a `store.findAll(type)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`null`

###### snapshot

`SnapshotRecordArray`

###### requestType

`"findAll"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "query", 
   query: Record<string, unknown>
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:65](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L65)

Builds the URL for a `store.query(type, query)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`null`

###### snapshot

`null`

###### requestType

`"query"`

###### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: null, 
   snapshot: null, 
   requestType: "queryRecord", 
   query: Record<string, unknown>
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:78](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L78)

Builds the URL for a `store.queryRecord(type, query)` call.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`null`

###### snapshot

`null`

###### requestType

`"queryRecord"`

###### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string[], 
   snapshot: Snapshot<unknown>[], 
   requestType: "findMany"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:94](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L94)

Builds the URL for coalescing multiple `store.findRecord(type, id)`
records into 1 request when the adapter's `coalesceFindRequests`
property is `true`. The `id` and `snapshot` parameters will be
arrays of ids and snapshots.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`\[]

###### snapshot

`Snapshot`<`unknown`>\[]

###### requestType

`"findMany"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findHasMany"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:107](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L107)

Builds the URL for fetching an async `hasMany` relationship when a
URL is not provided by the server.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"findHasMany"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "findBelongsTo"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:120](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L120)

Builds the URL for fetching an async `belongsTo` relationship when a
URL is not provided by the server.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"findBelongsTo"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string | null, 
   snapshot: Snapshot, 
   requestType: "createRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:133](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L133)

Builds the URL for a `record.save()` call when the record was
created locally using `store.createRecord()`.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string` | `null`

###### snapshot

`Snapshot`

###### requestType

`"createRecord"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "updateRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:146](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L146)

Builds the URL for a `record.save()` call when the record has been
updated locally.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"updateRecord"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot, 
   requestType: "deleteRecord"
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:159](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L159)

Builds the URL for a `record.save()` call when the record has been
deleted locally.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

###### requestType

`"deleteRecord"`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

#### Call Signature

```ts
buildURL(
   this: MixtBuildURLMixin, 
   modelName: string, 
   id: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:171](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L171)

Builds a URL for a given type and ID without a specific request type.

##### Parameters

###### this

`MixtBuildURLMixin`

###### modelName

`string`

###### id

`string`

###### snapshot

`Snapshot`

##### Returns

`string`

##### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`buildURL`](../../rest/classes/RESTAdapter.md#buildurl)

***

### createRecord()

```ts
createRecord(
   store: Store$1, 
   type: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:799](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L799)

Called by the store when a newly created record is
saved via the `save` method on a model record instance.

The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
to a URL computed by `buildURL`.

See `serialize` for information on how to customize the serialized form
of a record.

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`createRecord`](../../rest/classes/RESTAdapter.md#createrecord)

***

### deleteRecord()

```ts
deleteRecord(
   store: Store$1, 
   schema: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:836](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L836)

Called by the store when a record is deleted.

The `deleteRecord` method  makes an Ajax (HTTP DELETE) request to a URL computed by `buildURL`.

#### Parameters

##### store

`Store$1`

##### schema

`ModelSchema`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`deleteRecord`](../../rest/classes/RESTAdapter.md#deleterecord)

***

### findAll()

```ts
findAll(
   store: Store$1, 
   type: ModelSchema, 
   neverUsed: null, 
   snapshotRecordArray: SnapshotRecordArray
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:598](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L598)

Called by the store in order to fetch a JSON array for all
of the records for a given type.

The `findAll` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
promise for the resulting payload.

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### neverUsed

`null`

##### snapshotRecordArray

`SnapshotRecordArray`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`findAll`](../../rest/classes/RESTAdapter.md#findall)

***

### findBelongsTo()

```ts
findBelongsTo(
   store: Store$1, 
   snapshot: Snapshot, 
   url: string, 
   relationship: unknown
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:775](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L775)

Called by the store in order to fetch the JSON for the unloaded record in a
belongs-to relationship that was originally specified as a URL (inside of
`links`).

For example, if your original payload looks like this:

```js
{
  "person": {
    "id": 1,
    "name": "Tom Dale",
    "links": { "group": "/people/1/group" }
  }
}
```

This method will be called with the parent record and `/people/1/group`.

The `findBelongsTo` method will make an Ajax (HTTP GET) request to the originally specified URL.

The format of your `links` value will influence the final request URL via the `urlPrefix` method:

* Links beginning with `//`, `http://`, `https://`, will be used as is, with no further manipulation.

* Links beginning with a single `/` will have the current adapter's `host` value prepended to it.

* Links with no beginning `/` will have a parentURL prepended to it, via the current adapter's `buildURL`.

#### Parameters

##### store

`Store$1`

##### snapshot

`Snapshot`

##### url

`string`

##### relationship

`unknown`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`findBelongsTo`](../../rest/classes/RESTAdapter.md#findbelongsto)

***

### findHasMany()

```ts
findHasMany(
   store: Store$1, 
   snapshot: Snapshot, 
   url: string, 
   relationship: Record<string, unknown>
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:726](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L726)

Called by the store in order to fetch a JSON array for
the unloaded records in a has-many relationship that were originally
specified as a URL (inside of `links`).

For example, if your original payload looks like this:

```js
{
  "post": {
    "id": 1,
    "title": "Rails is omakase",
    "links": { "comments": "/posts/1/comments" }
  }
}
```

This method will be called with the parent record and `/posts/1/comments`.

The `findHasMany` method will make an Ajax (HTTP GET) request to the originally specified URL.

The format of your `links` value will influence the final request URL via the `urlPrefix` method:

* Links beginning with `//`, `http://`, `https://`, will be used as is, with no further manipulation.

* Links beginning with a single `/` will have the current adapter's `host` value prepended to it.

* Links with no beginning `/` will have a parentURL prepended to it, via the current adapter's `buildURL`.

#### Parameters

##### store

`Store$1`

##### snapshot

`Snapshot`

##### url

`string`

##### relationship

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`findHasMany`](../../rest/classes/RESTAdapter.md#findhasmany)

***

### findMany()

```ts
findMany(
   store: Store$1, 
   type: ModelSchema, 
   ids: string[], 
   snapshots: Snapshot<unknown>[]
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:250](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L250)

Called by the store in order to fetch several records together if `coalesceFindRequests` is true

For example, if the original payload looks like:

```js
{
  "id": 1,
  "title": "Rails is omakase",
  "comments": [ 1, 2, 3 ]
}
```

The IDs will be passed as a URL-encoded Array of IDs, in this form:

```
ids[]=1&ids[]=2&ids[]=3
```

Many servers, such as Rails and PHP, will automatically convert this URL-encoded array
into an Array for you on the server-side. If you want to encode the
IDs, differently, just override this (one-line) method.

The `findMany` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
promise for the resulting payload.

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### ids

`string`\[]

##### snapshots

`Snapshot`<`unknown`>\[]

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Overrides

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`findMany`](../../rest/classes/RESTAdapter.md#findmany)

***

### findRecord()

```ts
findRecord(
   store: Store$1, 
   type: ModelSchema, 
   id: string, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:582](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L582)

Called by the store in order to fetch the JSON for a given
type and ID.

The `findRecord` method makes an Ajax request to a URL computed by
`buildURL`, and returns a promise for the resulting payload.

This method performs an HTTP `GET` request with the id provided as part of the query string.

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### id

`string`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`findRecord`](../../rest/classes/RESTAdapter.md#findrecord)

***

### groupRecordsForFindMany()

```ts
groupRecordsForFindMany(store: Store$1, snapshots: Snapshot<unknown>[]): Snapshot<unknown>[][];
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:903](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L903)

Organize records into groups, each of which is to be passed to separate
calls to `findMany`.

This implementation groups together records that have the same base URL but
differing ids. For example `/comments/1` and `/comments/2` will be grouped together
because we know findMany can coalesce them together as `/comments?ids[]=1&ids[]=2`

It also supports urls where ids are passed as a query param, such as `/comments?id=1`
but not those where there is more than 1 query param such as `/comments?id=2&name=David`
Currently only the query param of `id` is supported. If you need to support others, please
override this or the `_stripIDFromURL` method.

It does not group records that have differing base urls, such as for example: `/posts/1/comments/2`
and `/posts/2/comments/3`

#### Parameters

##### store

`Store$1`

##### snapshots

`Snapshot`<`unknown`>\[]

#### Returns

`Snapshot`<`unknown`>\[]\[]

an array of arrays of records, each of which is to be
loaded separately by `findMany`.

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`groupRecordsForFindMany`](../../rest/classes/RESTAdapter.md#grouprecordsforfindmany)

***

### handleResponse()

```ts
handleResponse(
   status: number, 
   headers: Record<string, string>, 
   payload: Payload, 
   requestData: RequestData
): 
  | AdapterRequestErrorConstructor<AdapterError>
  | Payload;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:951](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L951)

Takes an ajax response, and returns the json payload or an error.

By default this hook just returns the json payload passed to it.
You might want to override it in two cases:

1. Your API might return useful results in the response headers.
   Response headers are passed in as the second argument.

2. Your API might return errors as successful responses with status code
   200 and an Errors text or object. You can return a `InvalidError` or a
   `AdapterError` (or a sub class) from this hook and it will automatically
   reject the promise and put your record into the invalid or error state.

Returning a `InvalidError` from this method will cause the
record to transition into the `invalid` state and make the
`errors` object available on the record. When returning an
`InvalidError` the store will attempt to normalize the error data
returned from the server using the serializer's `extractErrors`
method.

#### Parameters

##### status

`number`

##### headers

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `string`>

##### payload

`Payload`

##### requestData

[`RequestData`](../../rest/types/RequestData.md)

#### Returns

| [`AdapterRequestErrorConstructor`](../../error/types/AdapterRequestErrorConstructor.md)<[`AdapterError`](../../error/types/AdapterError.md)>
| `Payload`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`handleResponse`](../../rest/classes/RESTAdapter.md#handleresponse)

***

### isInvalid()

```ts
isInvalid(
   status: number, 
   _headers: Record<string, unknown>, 
   _payload: Payload
): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:1005](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L1005)

Default `handleResponse` implementation uses this hook to decide if the
response is an invalid error.

#### Parameters

##### status

`number`

##### \_headers

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### \_payload

`Payload`

#### Returns

`boolean`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`isInvalid`](../../rest/classes/RESTAdapter.md#isinvalid)

***

### isSuccess()

```ts
isSuccess(
   status: number, 
   _headers: Record<string, unknown>, 
   _payload: Payload
): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:994](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L994)

Default `handleResponse` implementation uses this hook to decide if the
response is a success.

#### Parameters

##### status

`number`

##### \_headers

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### \_payload

`Payload`

#### Returns

`boolean`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`isSuccess`](../../rest/classes/RESTAdapter.md#issuccess)

***

### pathForType()

```ts
pathForType(modelName: string): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:262](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L262)

Determines the pathname for a given type.

Unlike the base `BuildURLMixin` implementation, dasherizes (rather
than camelizes) the type name before pluralizing it, per the
{json:api} convention for member names.

#### Parameters

##### modelName

`string`

#### Returns

`string`

#### Overrides

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`pathForType`](../../rest/classes/RESTAdapter.md#pathfortype)

***

### query()

```ts
query(
   store: Store$1, 
   type: ModelSchema, 
   query: Record<string, unknown>
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:623](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L623)

Called by the store in order to fetch a JSON array for
the records that match a particular query.

The `query` method makes an Ajax (HTTP GET) request to a URL
computed by `buildURL`, and returns a promise for the resulting
payload.

The `query` argument is a simple JavaScript object that will be passed directly
to the server as parameters.

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`query`](../../rest/classes/RESTAdapter.md#query)

***

### queryRecord()

```ts
queryRecord(
   store: Store$1, 
   type: ModelSchema, 
   query: Record<string, unknown>, 
   adapterOptions: Record<string, unknown>
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:647](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L647)

Called by the store in order to fetch a JSON object for
the record that matches a particular query.

The `queryRecord` method makes an Ajax (HTTP GET) request to a URL
computed by `buildURL`, and returns a promise for the resulting
payload.

The `query` argument is a simple JavaScript object that will be passed directly
to the server as parameters.

#### Parameters

##### store

`Store$1`

##### type

`ModelSchema`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### adapterOptions

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`queryRecord`](../../rest/classes/RESTAdapter.md#queryrecord)

***

### serialize()

```ts
serialize(snapshot: Snapshot, options: SerializerOptions): Record<string, unknown>;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:464](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter.ts#L464)

Proxies to the serializer's `serialize` method.

Example

```js [app/adapters/application.js]
import { Adapter } from '@warp-drive/legacy/adapter';

export default class ApplicationAdapter extends Adapter {
  createRecord(store, type, snapshot) {
    let data = this.serialize(snapshot, { includeId: true });
    let url = `/${type.modelName}`;

    // ...
  }
}
```

#### Parameters

##### snapshot

`Snapshot`

##### options

[`SerializerOptions`](../../../compat/types/SerializerOptions.md)

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`serialize`](../../rest/classes/RESTAdapter.md#serialize)

***

### shouldBackgroundReloadAll()

```ts
shouldBackgroundReloadAll(store: Store$1, snapshotRecordArray: SnapshotRecordArray): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:871](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter.ts#L871)

This method is used by the store to determine if the store should
reload a record array after the `store.findAll` method resolves
with a cached record array.

This method is *only* checked by the store when the store is
returning a cached record array.

If this method returns `true` the store will re-fetch all records
from the adapter.

For example, if you do not want to fetch complex data over a mobile
connection, or if the network is down, you can implement
`shouldBackgroundReloadAll` as follows:

```javascript
shouldBackgroundReloadAll(store, snapshotArray) {
  let { downlink, effectiveType } = navigator.connection;

  return downlink > 0 && effectiveType === '4g';
}
```

By default this method returns `true`, indicating that a background reload
should always be triggered.

#### Parameters

##### store

`Store$1`

##### snapshotRecordArray

`SnapshotRecordArray`

#### Returns

`boolean`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`shouldBackgroundReloadAll`](../../rest/classes/RESTAdapter.md#shouldbackgroundreloadall)

***

### shouldBackgroundReloadRecord()

```ts
shouldBackgroundReloadRecord(store: Store$1, snapshot: Snapshot): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:835](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter.ts#L835)

This method is used by the store to determine if the store should
reload a record after the `store.findRecord` method resolves a
cached record.

This method is *only* checked by the store when the store is
returning a cached record.

If this method returns `true` the store will re-fetch a record from
the adapter.

For example, if you do not want to fetch complex data over a mobile
connection, or if the network is down, you can implement
`shouldBackgroundReloadRecord` as follows:

```javascript
shouldBackgroundReloadRecord(store, snapshot) {
  let { downlink, effectiveType } = navigator.connection;

  return downlink > 0 && effectiveType === '4g';
}
```

By default, this hook returns `true` so the data for the record is updated
in the background.

#### Parameters

##### store

`Store$1`

##### snapshot

`Snapshot`

#### Returns

`boolean`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`shouldBackgroundReloadRecord`](../../rest/classes/RESTAdapter.md#shouldbackgroundreloadrecord)

***

### shouldReloadAll()

```ts
shouldReloadAll(store: Store$1, snapshotRecordArray: SnapshotRecordArray): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:799](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter.ts#L799)

This method is used by the store to determine if the store should
reload all records from the adapter when records are requested by
`store.findAll`.

If this method returns `true`, the store will re-fetch all records from
the adapter. If this method returns `false`, the store will resolve
immediately using the cached records.

For example, if you are building an events ticketing system, in which users
can only reserve tickets for 20 minutes at a time, and want to ensure that
in each route you have data that is no more than 20 minutes old you could
write:

```javascript
shouldReloadAll(store, snapshotArray) {
  let snapshots = snapshotArray.snapshots();

  return snapshots.any((ticketSnapshot) => {
    let lastAccessedAt = ticketSnapshot.attr('lastAccessedAt');
    let timeDiff = moment().diff(lastAccessedAt, 'minutes');

    if (timeDiff > 20) {
      return true;
    } else {
      return false;
    }
  });
}
```

This method would ensure that whenever you do `store.findAll('ticket')` you
will always get a list of tickets that are no more than 20 minutes old. In
case a cached version is more than 20 minutes old, `findAll` will not
resolve until you fetched the latest versions.

By default, this method returns `true` if the passed `snapshotRecordArray`
is empty (meaning that there are no records locally available yet),
otherwise, it returns `false`.

Note that, with default settings, `shouldBackgroundReloadAll` will always
re-fetch all the records in the background even if `shouldReloadAll` returns
`false`. You can override `shouldBackgroundReloadAll` if this does not suit
your use case.

#### Parameters

##### store

`Store$1`

##### snapshotRecordArray

`SnapshotRecordArray`

#### Returns

`boolean`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`shouldReloadAll`](../../rest/classes/RESTAdapter.md#shouldreloadall)

***

### shouldReloadRecord()

```ts
shouldReloadRecord(store: Store$1, snapshot: Snapshot): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:744](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter.ts#L744)

This method is used by the store to determine if the store should
reload a record from the adapter when a record is requested by
`store.findRecord`.

If this method returns `true`, the store will re-fetch a record from
the adapter. If this method returns `false`, the store will resolve
immediately using the cached record.

For example, if you are building an events ticketing system, in which users
can only reserve tickets for 20 minutes at a time, and want to ensure that
in each route you have data that is no more than 20 minutes old you could
write:

```javascript
shouldReloadRecord(store, ticketSnapshot) {
  let lastAccessedAt = ticketSnapshot.attr('lastAccessedAt');
  let timeDiff = moment().diff(lastAccessedAt, 'minutes');

  if (timeDiff > 20) {
    return true;
  } else {
    return false;
  }
}
```

This method would ensure that whenever you do `store.findRecord('ticket',
id)` you will always get a ticket that is no more than 20 minutes old. In
case the cached version is more than 20 minutes old, `findRecord` will not
resolve until you fetched the latest version.

By default this hook returns `false`, as most UIs should not block user
interactions while waiting on data update.

Note that, with default settings, `shouldBackgroundReloadRecord` will always
re-fetch the records in the background even if `shouldReloadRecord` returns
`false`. You can override `shouldBackgroundReloadRecord` if this does not
suit your use case.

#### Parameters

##### store

`Store$1`

##### snapshot

`Snapshot`

#### Returns

`boolean`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`shouldReloadRecord`](../../rest/classes/RESTAdapter.md#shouldreloadrecord)

***

### sortQueryParams()

```ts
sortQueryParams(obj: Record<string, unknown>): Record<string, unknown>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:441](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L441)

By default, the RESTAdapter will send the query params sorted alphabetically to the
server.

For example:

```js
store.query('posts', { sort: 'price', category: 'pets' });
```

will generate a requests like this `/posts?category=pets&sort=price`, even if the
parameters were specified in a different order.

That way the generated URL will be deterministic and that simplifies caching mechanisms
in the backend.

Setting `sortQueryParams` to a falsey value will respect the original order.

In case you want to sort the query parameters with a different criteria, set
`sortQueryParams` to your custom sort function.

```js [app/adapters/application.js]
import { RESTAdapter } from '@warp-drive/legacy/adapter/rest';

export default class ApplicationAdapter extends RESTAdapter {
  sortQueryParams(params) {
    let sortedKeys = Object.keys(params).sort().reverse();
    let len = sortedKeys.length, newParams = {};

    for (let i = 0; i < len; i++) {
      newParams[sortedKeys[i]] = params[sortedKeys[i]];
    }

    return newParams;
  }
}
```

#### Parameters

##### obj

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`sortQueryParams`](../../rest/classes/RESTAdapter.md#sortqueryparams)

***

### updateRecord()

```ts
updateRecord(
   store: Store$1, 
   schema: ModelSchema, 
   snapshot: Snapshot
): Promise<AdapterPayload>;
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:267](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L267)

Called by the store when an existing record is saved
via the `save` method on a model record instance.

The `updateRecord` method serializes the record and makes an Ajax (HTTP PUT) request
to a URL computed by `buildURL`.

See `serialize` for information on how to customize the serialized form
of a record.

#### Parameters

##### store

`Store$1`

##### schema

`ModelSchema`

##### snapshot

`Snapshot`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`AdapterPayload`](../../../compat/types/AdapterPayload.md)>

#### Overrides

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`updateRecord`](../../rest/classes/RESTAdapter.md#updaterecord)

***

### urlForCreateRecord()

```ts
urlForCreateRecord(
   this: MixtBuildURLMixin, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:228](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L228)

Builds a URL for a `record.save()` call when the record was created
locally using `store.createRecord()`.

#### Parameters

##### this

`MixtBuildURLMixin`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForCreateRecord`](../../rest/classes/RESTAdapter.md#urlforcreaterecord)

***

### urlForDeleteRecord()

```ts
urlForDeleteRecord(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:242](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L242)

Builds a URL for a `record.save()` call when the record has been
deleted locally.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForDeleteRecord`](../../rest/classes/RESTAdapter.md#urlfordeleterecord)

***

### urlForFindAll()

```ts
urlForFindAll(
   this: MixtBuildURLMixin, 
   modelName: string, 
   snapshots: SnapshotRecordArray
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:187](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L187)

Builds a URL for a `store.findAll(type)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### modelName

`string`

##### snapshots

`SnapshotRecordArray`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForFindAll`](../../rest/classes/RESTAdapter.md#urlforfindall)

***

### urlForFindBelongsTo()

```ts
urlForFindBelongsTo(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:221](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L221)

Builds a URL for fetching an async `belongsTo` relationship when a
URL is not provided by the server.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForFindBelongsTo`](../../rest/classes/RESTAdapter.md#urlforfindbelongsto)

***

### urlForFindHasMany()

```ts
urlForFindHasMany(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:214](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L214)

Builds a URL for fetching an async `hasMany` relationship when a
URL is not provided by the server.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForFindHasMany`](../../rest/classes/RESTAdapter.md#urlforfindhasmany)

***

### urlForFindMany()

```ts
urlForFindMany(
   this: MixtBuildURLMixin, 
   ids: string[], 
   modelName: string, 
   snapshots: Snapshot<unknown>[]
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:207](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L207)

Builds a URL for coalescing multiple `store.findRecord(type, id)`
records into 1 request when the adapter's `coalesceFindRequests`
property is `true`.

#### Parameters

##### this

`MixtBuildURLMixin`

##### ids

`string`\[]

##### modelName

`string`

##### snapshots

`Snapshot`<`unknown`>\[]

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForFindMany`](../../rest/classes/RESTAdapter.md#urlforfindmany)

***

### urlForFindRecord()

```ts
urlForFindRecord(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:181](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L181)

Builds a URL for a `store.findRecord(type, id)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForFindRecord`](../../rest/classes/RESTAdapter.md#urlforfindrecord)

***

### urlForQuery()

```ts
urlForQuery(
   this: MixtBuildURLMixin, 
   query: Record<string, unknown>, 
   modelName: string
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:199](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L199)

Builds a URL for a `store.query(type, query)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### modelName

`string`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForQuery`](../../rest/classes/RESTAdapter.md#urlforquery)

***

### urlForQueryRecord()

```ts
urlForQueryRecord(
   this: MixtBuildURLMixin, 
   query: Record<string, unknown>, 
   modelName: string
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:193](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L193)

Builds a URL for a `store.queryRecord(type, query)` call.

#### Parameters

##### this

`MixtBuildURLMixin`

##### query

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

##### modelName

`string`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForQueryRecord`](../../rest/classes/RESTAdapter.md#urlforqueryrecord)

***

### urlForUpdateRecord()

```ts
urlForUpdateRecord(
   this: MixtBuildURLMixin, 
   id: string, 
   modelName: string, 
   snapshot: Snapshot
): string;
```

Defined in: [warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts:235](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/-private/build-url-mixin.ts#L235)

Builds a URL for a `record.save()` call when the record has been
updated locally.

#### Parameters

##### this

`MixtBuildURLMixin`

##### id

`string`

##### modelName

`string`

##### snapshot

`Snapshot`

#### Returns

`string`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`urlForUpdateRecord`](../../rest/classes/RESTAdapter.md#urlforupdaterecord)

## Properties

### \_defaultContentType

```ts
_defaultContentType: string = 'application/vnd.api+json';
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:161](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L161)

The `Content-Type` header used when serializing request bodies
that don't otherwise specify one.

#### Overrides

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`_defaultContentType`](../../rest/classes/RESTAdapter.md#_defaultcontenttype)

***

### headers

```ts
headers: 
  | Record<string, unknown>
  | undefined;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:568](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L568)

Some APIs require HTTP headers, e.g. to provide an API
key. Arbitrary headers can be set as key/value pairs on the
`RESTAdapter`'s `headers` object and WarpDrive will send them
along with each ajax request..

```js [app/adapters/application.js]
import { RESTAdapter } from '@warp-drive/legacy/adapter/rest';

export default class ApplicationAdapter extends RESTAdapter {
  get headers() {
    return {
      'API_KEY': 'secret key',
      'ANOTHER_HEADER': 'Some header value'
    };
  }
}
```

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`headers`](../../rest/classes/RESTAdapter.md#headers)

***

### host

```ts
host: string | null;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:359](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L359)

See "Host customization" above.

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`host`](../../rest/classes/RESTAdapter.md#host)

***

### maxURLLength

```ts
maxURLLength: number = 2048;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:881](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L881)

The maximum URL length to allow when coalescing `findRecord` requests
into a single `findMany` request via [groupRecordsForFindMany](../../rest/classes/RESTAdapter.md#grouprecordsforfindmany).
Requests that would exceed this length are split into multiple groups.

See http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`maxURLLength`](../../rest/classes/RESTAdapter.md#maxurllength)

***

### namespace

```ts
namespace: string | null;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:363](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L363)

See "Namespace customization" above.

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`namespace`](../../rest/classes/RESTAdapter.md#namespace)

***

### store

```ts
store: Store$1;
```

Defined in: [warp-drive-packages/legacy/src/adapter.ts:261](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter.ts#L261)

The Store service instance that owns this Adapter.

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`store`](../../rest/classes/RESTAdapter.md#store)

***

### useFetch

```ts
useFetch: boolean = true;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:371](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L371)

This property allows ajax to still be used instead when `false`.

#### Default

```ts
true
@public
```

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`useFetch`](../../rest/classes/RESTAdapter.md#usefetch)

### coalesceFindRequests

#### Get Signature

```ts
get coalesceFindRequests(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:238](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L238)

By default the JSONAPIAdapter will send each find request coming from a `store.find`
or from accessing a relationship separately to the server. If your server supports passing
ids as a query string, you can set coalesceFindRequests to true to coalesce all find requests
within a single runloop.

For example, if you have an initial payload of:

```javascript
{
  data: {
    id: 1,
    type: 'post',
    relationship: {
      comments: {
        data: [
          { id: 1, type: 'comment' },
          { id: 2, type: 'comment' }
        ]
      }
    }
  }
}
```

By default calling `post.comments` will trigger the following requests(assuming the
comments haven't been loaded before):

```
GET /comments/1
GET /comments/2
```

If you set coalesceFindRequests to `true` it will instead trigger the following request:

```
GET /comments?filter[id]=1,2
```

Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
relationships accessed within the same runloop. If you set `coalesceFindRequests: true`

```javascript
store.findRecord('comment', 1);
store.findRecord('comment', 2);
```

will also send a request to: `GET /comments?filter[id]=1,2`

Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
`groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.

##### Returns

`boolean`

#### Set Signature

```ts
set coalesceFindRequests(value: boolean): void;
```

Defined in: [warp-drive-packages/legacy/src/adapter/json-api.ts:246](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/json-api.ts#L246)

By default the RESTAdapter will send each find request coming from a `store.find`
or from accessing a relationship separately to the server. If your server supports passing
ids as a query string, you can set coalesceFindRequests to true to coalesce all find requests
within a single runloop.

For example, if you have an initial payload of:

```javascript
{
  post: {
    id: 1,
    comments: [1, 2]
  }
}
```

By default calling `post.comments` will trigger the following requests(assuming the
comments haven't been loaded before):

```
GET /comments/1
GET /comments/2
```

If you set coalesceFindRequests to `true` it will instead trigger the following request:

```
GET /comments?ids[]=1&ids[]=2
```

Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
relationships accessed within the same runloop. If you set `coalesceFindRequests: true`

```javascript
store.findRecord('comment', 1);
store.findRecord('comment', 2);
```

will also send a request to: `GET /comments?ids[]=1&ids[]=2`

Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
`groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.

##### Parameters

###### value

`boolean`

##### Returns

`void`

#### Overrides

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`coalesceFindRequests`](../../rest/classes/RESTAdapter.md#coalescefindrequests)

***

### fastboot

#### Get Signature

```ts
get fastboot(): FastBoot;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:384](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L384)

The FastBoot service instance, if running in a FastBoot environment.
Lazily looked up on first access.

##### Returns

`FastBoot`

#### Set Signature

```ts
set fastboot(value: FastBoot): void;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:397](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/adapter/rest.ts#L397)

Sets the FastBoot service instance to use.

##### Parameters

###### value

`FastBoot`

##### Returns

`void`

#### Inherited from

[`RESTAdapter`](../../rest/classes/RESTAdapter.md).[`fastboot`](../../rest/classes/RESTAdapter.md#fastboot)
