---
url: /pr-preview/pr-11154/api/@warp-drive/json-api/classes/JSONAPICache.md
---

# &#x20;JSONAPICache

Defined in: [-private/cache.ts:140](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L140)

```ts
import { JSONAPICache } from '@warp-drive/json-api';
```

A Cache implementation tuned for [{json:api}](https://jsonapi.org/)

## Implements

* `Cache`

## Constructors

### Constructor

```ts
new JSONAPICache(capabilities: CacheCapabilitiesManager$1): JSONAPICache;
```

Defined in: [-private/cache.ts:159](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L159)

#### Parameters

##### capabilities

`CacheCapabilitiesManager$1`

#### Returns

`JSONAPICache`

## Cache Management

APIs for primary cache management functionality

### mutate()

```ts
mutate(mutation: LocalRelationshipOperation): void;
```

Defined in: [-private/cache.ts:435](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L435)

Update the "local" or "current" (unpersisted) state of the Cache

#### Parameters

##### mutation

[`LocalRelationshipOperation`](../../core/types/graph/types/LocalRelationshipOperation.md)

#### Returns

`void`

#### Implementation of

```ts
Cache.mutate
```

***

### patch()

```ts
patch(op: 
  | Operation
  | Operation[]): void;
```

Defined in: [-private/cache.ts:407](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L407)

Update the "remote" or "canonical" (persisted) state of the Cache
by merging new information into the existing state.

#### Parameters

##### op

| [`Operation`](../../core/types/cache/operations/types/Operation.md)
| [`Operation`](../../core/types/cache/operations/types/Operation.md)\[]

the operation or list of operations to perform

#### Returns

`void`

#### Implementation of

```ts
Cache.patch
```

***

### peek()

```ts
peek(identifier: ResourceKey): 
  | ResourceObject
  | null;
peek(identifier: RequestKey): 
  | ResourceDocument
  | null;
```

#### Call Signature

```ts
peek(identifier: ResourceKey): 
  | ResourceObject
  | null;
```

Defined in: [-private/cache.ts:494](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L494)

Peek resource data from the Cache.

In development, if the return value
is JSON the return value
will be deep-cloned and deep-frozen
to prevent mutation thereby enforcing cache
Immutability.

This form of peek is useful for implementations
that want to feed raw-data from cache to the UI
or which want to interact with a blob of data
directly from the presentation cache.

An implementation might want to do this because
de-referencing records which read from their own
blob is generally safer because the record does
not require retainining connections to the Store
and Cache to present data on a per-field basis.

This generally takes the place of `getAttr` as
an API and may even take the place of `getRelationship`
depending on implementation specifics, though this
latter usage is less recommended due to the advantages
of the Graph handling necessary entanglements and
notifications for relational data.

:::warning
It is not recommended to use the return value as
a serialized representation of the resource both
due to it containing local mutations and because
it may contain additional fields not recognized
by the {json:api} API implementation such as `lid` and
the various internal WarpDrive bookkeeping fields.
:::

##### Parameters

###### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### Returns

| [`ResourceObject`](../../core/types/spec/json-api-raw/types/ResourceObject.md)
| `null`

##### Implementation of

```ts
Cache.peek
```

#### Call Signature

```ts
peek(identifier: RequestKey): 
  | ResourceDocument
  | null;
```

Defined in: [-private/cache.ts:495](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L495)

Peek the Cache for the [document](../../core/types/spec/document/types/ResourceDocument.md) associated with a request.

##### Parameters

###### identifier

[`RequestKey`](../../core/types/identifier/types/RequestKey.md)

##### Returns

| [`ResourceDocument`](../../core/types/spec/document/types/ResourceDocument.md)
| `null`

the known document data, if any

##### Implementation of

```ts
Cache.peek
```

***

### peekRemoteState()

```ts
peekRemoteState(identifier: ResourceKey): 
  | ResourceObject
  | null;
peekRemoteState(identifier: RequestKey): 
  | ResourceDocument
  | null;
```

#### Call Signature

```ts
peekRemoteState(identifier: ResourceKey): 
  | ResourceObject
  | null;
```

Defined in: [-private/cache.ts:559](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L559)

Peek the remote resource data from the Cache.

##### Parameters

###### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### Returns

| [`ResourceObject`](../../core/types/spec/json-api-raw/types/ResourceObject.md)
| `null`

##### Implementation of

```ts
Cache.peekRemoteState
```

#### Call Signature

```ts
peekRemoteState(identifier: RequestKey): 
  | ResourceDocument
  | null;
```

Defined in: [-private/cache.ts:560](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L560)

Peek remote [document](../../core/types/spec/document/types/ResourceDocument.md) data for a request from the Cache.

This will give the data provided from the server without any local changes.

##### Parameters

###### identifier

[`RequestKey`](../../core/types/identifier/types/RequestKey.md)

##### Returns

| [`ResourceDocument`](../../core/types/spec/document/types/ResourceDocument.md)
| `null`

the known document data, if any

##### Implementation of

```ts
Cache.peekRemoteState
```

***

### peekRequest()

```ts
peekRequest(identifier: RequestKey): 
  | StructuredDocument<ResourceDocument>
  | null;
```

Defined in: [-private/cache.ts:627](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L627)

Peek the Cache for the existing request data associated with
a cacheable request.

This is effectively the reverse of `put` for a request in
that it will return the the request, response, and content
whereas `peek` will return just the `content`.

#### Parameters

##### identifier

[`RequestKey`](../../core/types/identifier/types/RequestKey.md)

#### Returns

| `StructuredDocument`<[`ResourceDocument`](../../core/types/spec/document/types/ResourceDocument.md)>
| `null`

#### Implementation of

```ts
Cache.peekRequest
```

***

### put()

```ts
put<T extends SingleResourceDocument>(doc: StructuredDataDocument<T>): SingleResourceDataDocument;
put<T extends CollectionResourceDocument>(doc: StructuredDataDocument<T>): CollectionResourceDataDocument;
put<T extends ResourceErrorDocument>(doc: StructuredErrorDocument<T>): ResourceErrorDocument;
put<T extends ResourceMetaDocument>(doc: StructuredDataDocument<T>): ResourceMetaDocument;
```

#### Call Signature

```ts
put<T extends SingleResourceDocument>(doc: StructuredDataDocument<T>): SingleResourceDataDocument;
```

Defined in: [-private/cache.ts:209](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L209)

Cache the response to a request

Implements `Cache.put`.

Expects a StructuredDocument whose `content` member is a JsonApiDocument.

```js
cache.put({
  request: { url: 'https://api.example.com/v1/user/1' },
  content: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: 'Chris'
      }
    }
  }
})
```

> **Note**
> The nested `content` and `data` members are not a mistake. This is because
> there are two separate concepts involved here, the `StructuredDocument` which contains
> the context of a given Request that has been issued with the returned contents as its
> `content` property, and a `JSON:API Document` which is the json contents returned by
> this endpoint and which uses its `data` property to signify which resources are the
> primary resources associated with the request.

StructuredDocument's with urls will be cached as full documents with
associated resource membership order and contents preserved but linked
into the cache.

##### Type Parameters

###### T

`T` *extends* [`SingleResourceDocument`](../../core/types/spec/json-api-raw/types/SingleResourceDocument.md)

##### Parameters

###### doc

`StructuredDataDocument`<`T`>

##### Returns

[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)

##### Implementation of

```ts
Cache.put
```

#### Call Signature

```ts
put<T extends CollectionResourceDocument>(doc: StructuredDataDocument<T>): CollectionResourceDataDocument;
```

Defined in: [-private/cache.ts:210](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L210)

Cache the response to a request

Implements `Cache.put`.

Expects a StructuredDocument whose `content` member is a JsonApiDocument.

```js
cache.put({
  request: { url: 'https://api.example.com/v1/user/1' },
  content: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: 'Chris'
      }
    }
  }
})
```

> **Note**
> The nested `content` and `data` members are not a mistake. This is because
> there are two separate concepts involved here, the `StructuredDocument` which contains
> the context of a given Request that has been issued with the returned contents as its
> `content` property, and a `JSON:API Document` which is the json contents returned by
> this endpoint and which uses its `data` property to signify which resources are the
> primary resources associated with the request.

StructuredDocument's with urls will be cached as full documents with
associated resource membership order and contents preserved but linked
into the cache.

##### Type Parameters

###### T

`T` *extends* [`CollectionResourceDocument`](../../core/types/spec/json-api-raw/types/CollectionResourceDocument.md)

##### Parameters

###### doc

`StructuredDataDocument`<`T`>

##### Returns

[`CollectionResourceDataDocument`](../../core/types/spec/document/types/CollectionResourceDataDocument.md)

##### Implementation of

```ts
Cache.put
```

#### Call Signature

```ts
put<T extends ResourceErrorDocument>(doc: StructuredErrorDocument<T>): ResourceErrorDocument;
```

Defined in: [-private/cache.ts:211](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L211)

Cache the response to a request

Implements `Cache.put`.

Expects a StructuredDocument whose `content` member is a JsonApiDocument.

```js
cache.put({
  request: { url: 'https://api.example.com/v1/user/1' },
  content: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: 'Chris'
      }
    }
  }
})
```

> **Note**
> The nested `content` and `data` members are not a mistake. This is because
> there are two separate concepts involved here, the `StructuredDocument` which contains
> the context of a given Request that has been issued with the returned contents as its
> `content` property, and a `JSON:API Document` which is the json contents returned by
> this endpoint and which uses its `data` property to signify which resources are the
> primary resources associated with the request.

StructuredDocument's with urls will be cached as full documents with
associated resource membership order and contents preserved but linked
into the cache.

##### Type Parameters

###### T

`T` *extends* [`ResourceErrorDocument`](../../core/types/spec/document/types/ResourceErrorDocument.md)

##### Parameters

###### doc

`StructuredErrorDocument`<`T`>

##### Returns

[`ResourceErrorDocument`](../../core/types/spec/document/types/ResourceErrorDocument.md)

##### Implementation of

```ts
Cache.put
```

#### Call Signature

```ts
put<T extends ResourceMetaDocument>(doc: StructuredDataDocument<T>): ResourceMetaDocument;
```

Defined in: [-private/cache.ts:212](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L212)

Cache the response to a request

Implements `Cache.put`.

Expects a StructuredDocument whose `content` member is a JsonApiDocument.

```js
cache.put({
  request: { url: 'https://api.example.com/v1/user/1' },
  content: {
    data: {
      type: 'user',
      id: '1',
      attributes: {
        name: 'Chris'
      }
    }
  }
})
```

> **Note**
> The nested `content` and `data` members are not a mistake. This is because
> there are two separate concepts involved here, the `StructuredDocument` which contains
> the context of a given Request that has been issued with the returned contents as its
> `content` property, and a `JSON:API Document` which is the json contents returned by
> this endpoint and which uses its `data` property to signify which resources are the
> primary resources associated with the request.

StructuredDocument's with urls will be cached as full documents with
associated resource membership order and contents preserved but linked
into the cache.

##### Type Parameters

###### T

`T` *extends* [`ResourceMetaDocument`](../../core/types/spec/document/types/ResourceMetaDocument.md)

##### Parameters

###### doc

`StructuredDataDocument`<`T`>

##### Returns

[`ResourceMetaDocument`](../../core/types/spec/document/types/ResourceMetaDocument.md)

##### Implementation of

```ts
Cache.put
```

***

### upsert()

```ts
upsert(
   identifier: ResourceKey, 
   data: ExistingResourceObject, 
   calculateChanges?: boolean
): void | string[];
```

Defined in: [-private/cache.ts:638](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L638)

Push resource data from a remote source into the cache for this identifier

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### data

[`ExistingResourceObject`](../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)

##### calculateChanges?

`boolean`

#### Returns

`void` | `string`\[]

if `calculateChanges` is true then calculated key changes should be returned

#### Implementation of

```ts
Cache.upsert
```

## Resource Lifecycle

APIs that support management of resource data

### clientDidCreate()

```ts
clientDidCreate(identifier: ResourceKey, options?: Record<string, Value>): Record<string, unknown>;
```

Defined in: [-private/cache.ts:770](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L770)

\[LIFECYCLE] Signal to the cache that a new record has been instantiated on the client

It returns properties from options that should be set on the record during the create
process. This return value behavior is deprecated.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, [`Value`](../../core/types/json/raw/types/Value.md)>

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Implementation of

```ts
Cache.clientDidCreate
```

***

### commitWasRejected()

```ts
commitWasRejected(identifier: 
  | ResourceKey
  | ResourceKey[], errors?: ApiError[]): void;
```

Defined in: [-private/cache.ts:949](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L949)

\[LIFECYCLE] Signals to the cache that a resource
was update via a save transaction failed.

#### Parameters

##### identifier

| [`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)
| [`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)\[]

##### errors?

[`ApiError`](../../core/types/spec/error/types/ApiError.md)\[]

#### Returns

`void`

#### Implementation of

```ts
Cache.commitWasRejected
```

***

### didCommit()

```ts
didCommit(committedIdentifier: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<PersistedResourceKey<string>, PersistedResourceKey<string>>>
  | null): SingleResourceDataDocument;
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<PersistedResourceKey<string>, PersistedResourceKey<string>>>
  | null): SingleResourceDataDocument;
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<CollectionResourceDataDocument<PersistedResourceKey<string>>>
  | null): CollectionResourceDataDocument;
```

#### Call Signature

```ts
didCommit(committedIdentifier: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<PersistedResourceKey<string>, PersistedResourceKey<string>>>
  | null): SingleResourceDataDocument;
```

Defined in: [-private/cache.ts:865](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L865)

\[LIFECYCLE] Signals to the cache that a resource
was successfully updated as part of a save transaction.

##### Parameters

###### committedIdentifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

###### result

| `StructuredDataDocument`<[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)<[`PersistedResourceKey`](../../core/types/identifier/types/PersistedResourceKey.md)<`string`>, [`PersistedResourceKey`](../../core/types/identifier/types/PersistedResourceKey.md)<`string`>>>
| `null`

##### Returns

[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)

##### Implementation of

```ts
Cache.didCommit
```

#### Call Signature

```ts
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<PersistedResourceKey<string>, PersistedResourceKey<string>>>
  | null): SingleResourceDataDocument;
```

Defined in: [-private/cache.ts:869](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L869)

\[LIFECYCLE] Signals to the cache that a set of resources
was successfully updated as part of a save transaction that
resulted in a single resource being returned.

##### Parameters

###### committedIdentifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)\[]

###### result

| `StructuredDataDocument`<[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)<[`PersistedResourceKey`](../../core/types/identifier/types/PersistedResourceKey.md)<`string`>, [`PersistedResourceKey`](../../core/types/identifier/types/PersistedResourceKey.md)<`string`>>>
| `null`

a document in the cache format containing any updated data

##### Returns

[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)

##### Implementation of

```ts
Cache.didCommit
```

#### Call Signature

```ts
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<CollectionResourceDataDocument<PersistedResourceKey<string>>>
  | null): CollectionResourceDataDocument;
```

Defined in: [-private/cache.ts:873](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L873)

\[LIFECYCLE] Signals to the cache that a set of resources
was successfully updated as part of a save transaction that
resulted in a collection of resources being returned.

##### Parameters

###### committedIdentifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)\[]

###### result

| `StructuredDataDocument`<[`CollectionResourceDataDocument`](../../core/types/spec/document/types/CollectionResourceDataDocument.md)<[`PersistedResourceKey`](../../core/types/identifier/types/PersistedResourceKey.md)<`string`>>>
| `null`

a document in the cache format containing any updated data

##### Returns

[`CollectionResourceDataDocument`](../../core/types/spec/document/types/CollectionResourceDataDocument.md)

##### Implementation of

```ts
Cache.didCommit
```

***

### unloadRecord()

```ts
unloadRecord(identifier: ResourceKey): void;
```

Defined in: [-private/cache.ts:969](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L969)

\[LIFECYCLE] Signals to the cache that all data for a resource
should be cleared.

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`void`

#### Implementation of

```ts
Cache.unloadRecord
```

***

### willCommit()

```ts
willCommit(identifier: 
  | ResourceKey
  | ResourceKey[], _context: RequestContext | null): void;
```

Defined in: [-private/cache.ts:848](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L848)

\[LIFECYCLE] Signals to the cache that a resource
will be part of a save transaction.

#### Parameters

##### identifier

| [`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)
| [`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)\[]

##### \_context

`RequestContext` | `null`

#### Returns

`void`

#### Implementation of

```ts
Cache.willCommit
```

## Resource Data

APIs that support granular field level management of resource data

### changedAttrs()

```ts
changedAttrs(identifier: ResourceKey): ChangedAttributesHash;
```

Defined in: [-private/cache.ts:1308](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1308)

Query the cache for the changed attributes of a resource.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`ChangedAttributesHash`

`{ '<field>': ['<old>', '<new>'] }`

#### Implementation of

```ts
Cache.changedAttrs
```

***

### changedRelationships()

```ts
changedRelationships(identifier: ResourceKey): Map<string, RelationshipDiff>;
```

Defined in: [-private/cache.ts:1422](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1422)

Query the cache for the changes to relationships of a resource.

Returns a map of relationship names to RelationshipDiff objects.

```ts
type RelationshipDiff =
  | {
     kind: 'collection';
     remoteState: ResourceKey[];
     additions: Set<ResourceKey>;
     removals: Set<ResourceKey>;
     localState: ResourceKey[];
     reordered: boolean;
    }
  | {
     kind: 'resource';
     remoteState: ResourceKey | null;
     localState: ResourceKey | null;
   };
```

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, `RelationshipDiff`>

#### Implementation of

```ts
Cache.changedRelationships
```

***

### getAttr()

```ts
getAttr(identifier: ResourceKey, attr: string | string[]): Value | undefined;
```

Defined in: [-private/cache.ts:1051](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1051)

Retrieve the data for an attribute from the cache
with local mutations applied.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### attr

`string` | `string`\[]

#### Returns

[`Value`](../../core/types/json/raw/types/Value.md) | `undefined`

#### Implementation of

```ts
Cache.getAttr
```

***

### getRelationship()

```ts
getRelationship(identifier: ResourceKey, field: string): 
  | ResourceRelationship<ResourceKey>
| CollectionRelationship<ResourceKey>;
```

Defined in: [-private/cache.ts:1464](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1464)

Query the cache for the current state of a relationship property

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### field

`string`

#### Returns

| [`ResourceRelationship`](../../core/types/cache/relationship/types/ResourceRelationship.md)<[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)>
| [`CollectionRelationship`](../../core/types/cache/relationship/types/CollectionRelationship.md)<[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)>

resource relationship object

#### Implementation of

```ts
Cache.getRelationship
```

***

### getRemoteAttr()

```ts
getRemoteAttr(identifier: ResourceKey, attr: string | string[]): Value | undefined;
```

Defined in: [-private/cache.ts:1122](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1122)

Retrieve the remote data for an attribute from the cache

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### attr

`string` | `string`\[]

#### Returns

[`Value`](../../core/types/json/raw/types/Value.md) | `undefined`

#### Implementation of

```ts
Cache.getRemoteAttr
```

***

### getRemoteRelationship()

```ts
getRemoteRelationship(identifier: ResourceKey, field: string): 
  | ResourceRelationship<ResourceKey>
| CollectionRelationship<ResourceKey>;
```

Defined in: [-private/cache.ts:1475](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1475)

Query the cache for the remote state of a relationship property

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### field

`string`

#### Returns

| [`ResourceRelationship`](../../core/types/cache/relationship/types/ResourceRelationship.md)<[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)>
| [`CollectionRelationship`](../../core/types/cache/relationship/types/CollectionRelationship.md)<[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)>

resource relationship object

#### Implementation of

```ts
Cache.getRemoteRelationship
```

***

### hasChangedAttrs()

```ts
hasChangedAttrs(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1331](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1331)

Query the cache for whether any mutated attributes exist

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Implementation of

```ts
Cache.hasChangedAttrs
```

***

### hasChangedRelationships()

```ts
hasChangedRelationships(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1432](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1432)

Query the cache for whether any mutated relationships exist

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Implementation of

```ts
Cache.hasChangedRelationships
```

***

### rollbackAttrs()

```ts
rollbackAttrs(identifier: ResourceKey): string[];
```

Defined in: [-private/cache.ts:1359](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1359)

Tell the cache to discard any uncommitted mutations to attributes

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`string`\[]

the names of fields that were restored

#### Implementation of

```ts
Cache.rollbackAttrs
```

***

### rollbackRelationships()

```ts
rollbackRelationships(identifier: ResourceKey): string[];
```

Defined in: [-private/cache.ts:1447](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1447)

Tell the cache to discard any uncommitted mutations to relationships.

This will also discard the change on any appropriate inverses.

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`string`\[]

the names of relationships that were restored

#### Implementation of

```ts
Cache.rollbackRelationships
```

***

### setAttr()

```ts
setAttr(
   identifier: ResourceKey, 
   attr: string | string[], 
   value: Value
): void;
```

Defined in: [-private/cache.ts:1189](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1189)

Mutate the data for an attribute in the cache

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### attr

`string` | `string`\[]

##### value

[`Value`](../../core/types/json/raw/types/Value.md)

#### Returns

`void`

#### Implementation of

```ts
Cache.setAttr
```

## Resource State

APIs that support managing Resource states

### getErrors()

```ts
getErrors(identifier: ResourceKey): ApiError[];
```

Defined in: [-private/cache.ts:1505](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1505)

Query the cache for any validation errors applicable to the given resource.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

[`ApiError`](../../core/types/spec/error/types/ApiError.md)\[]

#### Implementation of

```ts
Cache.getErrors
```

***

### isDeleted()

```ts
isDeleted(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1539](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1539)

Query the cache for whether a given resource is marked as deleted (but not
necessarily persisted yet).

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Implementation of

```ts
Cache.isDeleted
```

***

### isDeletionCommitted()

```ts
isDeletionCommitted(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1551](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1551)

Query the cache for whether a given resource has been deleted and that deletion
has also been persisted.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Implementation of

```ts
Cache.isDeletionCommitted
```

***

### isEmpty()

```ts
isEmpty(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1515](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1515)

Query the cache for whether a given resource has any available data

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Implementation of

```ts
Cache.isEmpty
```

***

### isNew()

```ts
isNew(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1527](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1527)

Query the cache for whether a given resource was created locally and not
yet persisted.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Implementation of

```ts
Cache.isNew
```

***

### setIsDeleted()

```ts
setIsDeleted(identifier: ResourceKey, isDeleted: boolean): void;
```

Defined in: [-private/cache.ts:1492](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L1492)

Update the cache state for the given resource to be marked
as locally deleted, or remove such a mark.

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### isDeleted

`boolean`

#### Returns

`void`

#### Implementation of

```ts
Cache.setIsDeleted
```

## Other

### version

```ts
version: "2";
```

Defined in: [-private/cache.ts:146](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/json-api/src/-private/cache.ts#L146)

The Cache Version that this implementation implements.

#### Implementation of

```ts
Cache.version
```
