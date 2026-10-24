---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/json-api/classes/JSONAPICache.md
---

# &#x20;JSONAPICache

Defined in: [-private/cache.ts:317](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L317)

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

Defined in: [-private/cache.ts:336](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L336)

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

Defined in: [-private/cache.ts:632](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L632)

Update the "local" or "current" (unpersisted) state of the Cache

#### Parameters

##### mutation

[`LocalRelationshipOperation`](../../core/types/graph/types/LocalRelationshipOperation.md)

#### Returns

`void`

#### Example

```ts
cache.mutate({
  op: 'replaceRelatedRecord',
  record: identifier,
  field: 'author',
  value: authorIdentifier,
});
```

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

Defined in: [-private/cache.ts:594](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L594)

Update the "remote" or "canonical" (persisted) state of the Cache
by merging new information into the existing state.

#### Parameters

##### op

| [`Operation`](../../core/types/cache/operations/types/Operation.md)
| [`Operation`](../../core/types/cache/operations/types/Operation.md)\[]

the operation or list of operations to perform

#### Returns

`void`

#### Example

```ts
cache.patch({
  op: 'update',
  record: identifier,
  field: 'name',
  value: 'Chris',
});
```

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

Defined in: [-private/cache.ts:697](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L697)

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

This generally takes the place of [getAttr](#getattr) as
an API and may even take the place of [getRelationship](#getrelationship)
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

##### Example

```ts
const resource = cache.peek(identifier);
const document = cache.peek(requestKey);
```

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

Defined in: [-private/cache.ts:698](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L698)

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

Defined in: [-private/cache.ts:768](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L768)

Peek the remote resource data from the Cache.

##### Parameters

###### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### Returns

| [`ResourceObject`](../../core/types/spec/json-api-raw/types/ResourceObject.md)
| `null`

##### Example

```ts
const resource = cache.peekRemoteState(identifier);
const document = cache.peekRemoteState(requestKey);
```

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

Defined in: [-private/cache.ts:769](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L769)

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

Defined in: [-private/cache.ts:841](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L841)

Peek the Cache for the existing request data associated with
a cacheable request.

This is effectively the reverse of [put](#put) for a request in
that it will return the the request, response, and content
whereas [peek](#peek) will return just the `content`.

#### Parameters

##### identifier

[`RequestKey`](../../core/types/identifier/types/RequestKey.md)

#### Returns

| `StructuredDocument`<[`ResourceDocument`](../../core/types/spec/document/types/ResourceDocument.md)>
| `null`

#### Example

```ts
const doc = cache.peekRequest(requestKey);
```

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

Defined in: [-private/cache.ts:386](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L386)

Cache the response to a request

Implements Cache.put | Cache.put.

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

Defined in: [-private/cache.ts:387](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L387)

Cache the response to a request

Implements Cache.put | Cache.put.

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

Defined in: [-private/cache.ts:388](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L388)

Cache the response to a request

Implements Cache.put | Cache.put.

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

Defined in: [-private/cache.ts:389](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L389)

Cache the response to a request

Implements Cache.put | Cache.put.

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

Defined in: [-private/cache.ts:863](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L863)

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

when `calculateChanges` is true, the names of the attributes whose persisted value
this push changed (the same keys the `'remote'` channel is notified with), or `undefined`
when none did. Otherwise `void`.

#### Example

```ts
cache.upsert(identifier, {
  type: 'user',
  id: '1',
  attributes: { name: 'Chris' },
});
```

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

Defined in: [-private/cache.ts:1000](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1000)

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

#### Example

```ts
cache.clientDidCreate(identifier, { name: 'Chris' });
```

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

Defined in: [-private/cache.ts:1197](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1197)

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

#### Example

```ts
cache.commitWasRejected(identifier, errors);
```

#### Implementation of

```ts
Cache.commitWasRejected
```

***

### didCommit()

```ts
didCommit(committedIdentifier: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<CollectionResourceDataDocument<ExistingResourceObject<string>>>
  | null): CollectionResourceDataDocument;
```

#### Call Signature

```ts
didCommit(committedIdentifier: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
```

Defined in: [-private/cache.ts:1105](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1105)

\[LIFECYCLE] Signals to the cache that a resource
was successfully updated as part of a save transaction.

##### Parameters

###### committedIdentifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

###### result

| `StructuredDataDocument`<[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)<[`ExistingResourceObject`](../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)<`string`>, [`ExistingResourceObject`](../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)<`string`>>>
| `null`

##### Returns

[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)

##### Example

```ts
cache.didCommit(identifier, result);
```

##### Implementation of

```ts
Cache.didCommit
```

#### Call Signature

```ts
didCommit(committedIdentifier: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
```

Defined in: [-private/cache.ts:1109](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1109)

\[LIFECYCLE] Signals to the cache that a set of resources
was successfully updated as part of a save transaction that
resulted in a single resource being returned.

##### Parameters

###### committedIdentifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)\[]

###### result

| `StructuredDataDocument`<[`SingleResourceDataDocument`](../../core/types/spec/document/types/SingleResourceDataDocument.md)<[`ExistingResourceObject`](../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)<`string`>, [`ExistingResourceObject`](../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)<`string`>>>
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
  | StructuredDataDocument<CollectionResourceDataDocument<ExistingResourceObject<string>>>
  | null): CollectionResourceDataDocument;
```

Defined in: [-private/cache.ts:1113](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1113)

\[LIFECYCLE] Signals to the cache that a set of resources
was successfully updated as part of a save transaction that
resulted in a collection of resources being returned.

##### Parameters

###### committedIdentifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)\[]

###### result

| `StructuredDataDocument`<[`CollectionResourceDataDocument`](../../core/types/spec/document/types/CollectionResourceDataDocument.md)<[`ExistingResourceObject`](../../core/types/spec/json-api-raw/types/ExistingResourceObject.md)<`string`>>>
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

Defined in: [-private/cache.ts:1222](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1222)

\[LIFECYCLE] Signals to the cache that all data for a resource
should be cleared.

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`void`

#### Example

```ts
cache.unloadRecord(identifier);
```

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

Defined in: [-private/cache.ts:1083](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1083)

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

#### Example

```ts
cache.willCommit(identifier, context);
```

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

Defined in: [-private/cache.ts:1537](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1537)

Query the cache for the changed attributes of a resource: every unsaved
mutation, as a `[before, after]` pair per field.

`before` is the value the mutation replaces, which is not always the
persisted one. A mutation a save is carrying replaces remote state; an edit
made while that save is in flight replaces the in-flight value. So this is
what saving from here would change, which is what `serializePatch` and the
legacy `Snapshot` consume, rather than a diff against persisted state.

Derived from the layers on each call, so it is always consistent with
[getAttr](#getattr) and
[rollbackAttrs](#rollbackattrs). Dirtiness does not go
through here; see [hasChangedAttrs](#haschangedattrs).

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`ChangedAttributesHash`

`{ '<field>': ['<old>', '<new>'] }`

#### Example

```ts
const changes = cache.changedAttrs(identifier);
// { name: ['Igor', 'Chris'] }
```

#### Implementation of

```ts
Cache.changedAttrs
```

***

### changedRelationships()

```ts
changedRelationships(identifier: ResourceKey): Map<string, RelationshipDiff>;
```

Defined in: [-private/cache.ts:1682](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1682)

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

#### Example

```ts
const diffs = cache.changedRelationships(identifier);
const comments = diffs.get('comments');
```

#### Implementation of

```ts
Cache.changedRelationships
```

***

### getAttr()

```ts
getAttr(identifier: ResourceKey, attr: string | string[]): Value | undefined;
```

Defined in: [-private/cache.ts:1310](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1310)

Retrieve the data for an attribute from the cache
with local mutations applied.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### attr

`string` | `string`\[]

#### Returns

[`Value`](../../core/types/json/raw/types/Value.md) | `undefined`

#### Example

```ts
const name = cache.getAttr(identifier, 'name');
const zip = cache.getAttr(identifier, ['address', 'zip']);
```

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

Defined in: [-private/cache.ts:1741](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1741)

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

#### Example

```ts
const relationship = cache.getRelationship(identifier, 'comments');
```

#### Implementation of

```ts
Cache.getRelationship
```

***

### getRemoteAttr()

```ts
getRemoteAttr(identifier: ResourceKey, attr: string | string[]): Value | undefined;
```

Defined in: [-private/cache.ts:1362](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1362)

Retrieve the remote data for an attribute from the cache

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

##### attr

`string` | `string`\[]

#### Returns

[`Value`](../../core/types/json/raw/types/Value.md) | `undefined`

#### Example

```ts
const name = cache.getRemoteAttr(identifier, 'name');
```

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

Defined in: [-private/cache.ts:1757](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1757)

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

#### Example

```ts
const relationship = cache.getRemoteRelationship(identifier, 'comments');
```

#### Implementation of

```ts
Cache.getRemoteRelationship
```

***

### hasChangedAttrs()

```ts
hasChangedAttrs(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1581](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1581)

Query the cache for whether any mutated attributes exist

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Example

```ts
if (cache.hasChangedAttrs(identifier)) {
  // ...
}
```

#### Implementation of

```ts
Cache.hasChangedAttrs
```

***

### hasChangedRelationships()

```ts
hasChangedRelationships(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1699](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1699)

Query the cache for whether any mutated relationships exist

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Example

```ts
if (cache.hasChangedRelationships(identifier)) {
  // ...
}
```

#### Implementation of

```ts
Cache.hasChangedRelationships
```

***

### rollbackAttrs()

```ts
rollbackAttrs(identifier: ResourceKey): string[];
```

Defined in: [-private/cache.ts:1614](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1614)

Tell the cache to discard any uncommitted mutations to attributes

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`string`\[]

the names of fields that were restored

#### Example

```ts
const restoredKeys = cache.rollbackAttrs(identifier);
```

#### Implementation of

```ts
Cache.rollbackAttrs
```

***

### rollbackRelationships()

```ts
rollbackRelationships(identifier: ResourceKey): string[];
```

Defined in: [-private/cache.ts:1719](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1719)

Tell the cache to discard any uncommitted mutations to relationships.

This will also discard the change on any appropriate inverses.

This method is a candidate to become a mutation

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`string`\[]

the names of relationships that were restored

#### Example

```ts
const restoredFields = cache.rollbackRelationships(identifier);
```

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

Defined in: [-private/cache.ts:1416](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1416)

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

#### Example

```ts
cache.setAttr(identifier, 'name', 'Chris');
```

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

Defined in: [-private/cache.ts:1797](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1797)

Query the cache for any validation errors applicable to the given resource.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

[`ApiError`](../../core/types/spec/error/types/ApiError.md)\[]

#### Example

```ts
const errors = cache.getErrors(identifier);
```

#### Implementation of

```ts
Cache.getErrors
```

***

### isDeleted()

```ts
isDeleted(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1852](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1852)

Query the cache for whether a given resource is marked as deleted (but not
necessarily persisted yet).

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Example

```ts
if (cache.isDeleted(identifier)) {
  // ...
}
```

#### Implementation of

```ts
Cache.isDeleted
```

***

### isDeletionCommitted()

```ts
isDeletionCommitted(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1871](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1871)

Query the cache for whether a given resource has been deleted and that deletion
has also been persisted.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Example

```ts
if (cache.isDeletionCommitted(identifier)) {
  // ...
}
```

#### Implementation of

```ts
Cache.isDeletionCommitted
```

***

### isEmpty()

```ts
isEmpty(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1814](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1814)

Query the cache for whether a given resource has any available data

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Example

```ts
if (cache.isEmpty(identifier)) {
  // ...
}
```

#### Implementation of

```ts
Cache.isEmpty
```

***

### isNew()

```ts
isNew(identifier: ResourceKey): boolean;
```

Defined in: [-private/cache.ts:1833](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1833)

Query the cache for whether a given resource was created locally and not
yet persisted.

#### Parameters

##### identifier

[`ResourceKey`](../../core/types/identifier/types/ResourceKey.md)

#### Returns

`boolean`

#### Example

```ts
if (cache.isNew(identifier)) {
  // ...
}
```

#### Implementation of

```ts
Cache.isNew
```

***

### setIsDeleted()

```ts
setIsDeleted(identifier: ResourceKey, isDeleted: boolean): void;
```

Defined in: [-private/cache.ts:1779](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L1779)

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

#### Example

```ts
cache.setIsDeleted(identifier, true);
```

#### Implementation of

```ts
Cache.setIsDeleted
```

## Other

### version

```ts
version: "2";
```

Defined in: [-private/cache.ts:323](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/json-api/src/-private/cache.ts#L323)

The Cache Version that this implementation implements.

#### Implementation of

```ts
Cache.version
```
