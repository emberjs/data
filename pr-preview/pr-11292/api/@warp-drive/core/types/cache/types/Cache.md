---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/cache/types/Cache.md
---

# &#x20;Cache

```ts
interface Cache {
  version: "2";
  changedAttrs(cacheKey: ResourceKey): ChangedAttributesHash;
  changedRelationships(cacheKey: ResourceKey): Map<string, RelationshipDiff>;
  clientDidCreate(cacheKey: ResourceKey, createArgs?: Record<string, unknown>): Record<string, unknown>;
  commitWasRejected(cacheKey: 
  | ResourceKey
  | ResourceKey[], errors?: ApiError[]): void;
  didCommit(cacheKey: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
  didCommit(cacheKey: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
  didCommit(cacheKey: ResourceKey[], result: 
  | StructuredDataDocument<CollectionResourceDataDocument<ExistingResourceObject<string>>>
  | null): CollectionResourceDataDocument;
  diff(): Promise<Change[]>;
  dump(): Promise<ReadableStream<unknown>>;
  fork(): Promise<Cache>;
  getAttr(cacheKey: ResourceKey, field: string | string[]): Value | undefined;
  getErrors(cacheKey: ResourceKey): ApiError[];
  getRelationship(cacheKey: ResourceKey, field: string, isCollection?: boolean): 
  | ResourceRelationship<ResourceKey>
  | CollectionRelationship<ResourceKey>;
  getRemoteAttr(cacheKey: ResourceKey, field: string | string[]): Value | undefined;
  getRemoteRelationship(cacheKey: ResourceKey, field: string, isCollection?: boolean): 
  | ResourceRelationship<ResourceKey>
  | CollectionRelationship<ResourceKey>;
  hasChangedAttrs(cacheKey: ResourceKey): boolean;
  hasChangedRelationships(cacheKey: ResourceKey): boolean;
  hydrate(stream: ReadableStream<unknown>): Promise<void>;
  isDeleted(cacheKey: ResourceKey): boolean;
  isDeletionCommitted(cacheKey: ResourceKey): boolean;
  isEmpty(cacheKey: ResourceKey): boolean;
  isNew(cacheKey: ResourceKey): boolean;
  merge(cache: Cache): Promise<void>;
  mutate(mutation: Mutation): void;
  patch(op: 
  | Operation
  | Operation[]): void;
  peek<T = unknown>(cacheKey: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peek(cacheKey: RequestKey): 
  | ResourceDocument
  | null;
  peekRemoteState<T = unknown>(cacheKey: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
  peekRemoteState(cacheKey: RequestKey): 
  | ResourceDocument
  | null;
  peekRequest(cacheKey: RequestKey): 
  | StructuredDocument<ResourceDocument>
  | null;
  put<T>(doc: 
  | StructuredDocument<T>
  | {
  content: T;
}): ResourceDocument;
  rollbackAttrs(cacheKey: ResourceKey): string[];
  rollbackRelationships(cacheKey: ResourceKey): string[];
  setAttr(cacheKey: ResourceKey, field: string | string[], value: Value): void;
  setIsDeleted(cacheKey: ResourceKey, isDeleted: boolean): void;
  unloadRecord(cacheKey: ResourceKey): void;
  upsert(cacheKey: ResourceKey, data: unknown, hasRecord: boolean): void | string[];
  willCommit(cacheKey: 
  | ResourceKey
  | ResourceKey[], context: RequestContext | null): void;
}
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:87](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L87)

The interface for WarpDrive Caches.

A Cache handles in-memory storage of Document and Resource
data.

## Methods

### changedAttrs()

```ts
changedAttrs(cacheKey: ResourceKey): ChangedAttributesHash;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:421](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L421)

Query the cache for the changed attributes of a resource.

Returns a map of field names to tuples of \[old, new] values

```
{ <field>: [<old>, <new>] }
```

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

[`ChangedAttributesHash`](ChangedAttributesHash.md)

***

### changedRelationships()

```ts
changedRelationships(cacheKey: ResourceKey): Map<string, RelationshipDiff>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:447](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L447)

Query the cache for the changes to relationships of a resource.

Returns a map of relationship names to [RelationshipDiff](RelationshipDiff.md) objects.

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

[`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<`string`, [`RelationshipDiff`](RelationshipDiff.md)>

***

### clientDidCreate()

```ts
clientDidCreate(cacheKey: ResourceKey, createArgs?: Record<string, unknown>): Record<string, unknown>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:317](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L317)

\[LIFECYCLE] Signal to the cache that a new record has been instantiated on the client

It returns properties from options that should be set on the record during the create
process. This return value behavior is deprecated.

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### createArgs?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

***

### commitWasRejected()

```ts
commitWasRejected(cacheKey: 
  | ResourceKey
  | ResourceKey[], errors?: ApiError[]): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:372](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L372)

\[LIFECYCLE] Signals to the cache that a resource
was update via a save transaction failed.

#### Parameters

##### cacheKey

| [`ResourceKey`](../../identifier/types/ResourceKey.md)
| [`ResourceKey`](../../identifier/types/ResourceKey.md)\[]

##### errors?

[`ApiError`](../../spec/error/types/ApiError.md)\[]

#### Returns

`void`

***

### didCommit()

```ts
didCommit(cacheKey: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
didCommit(cacheKey: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
didCommit(cacheKey: ResourceKey[], result: 
  | StructuredDataDocument<CollectionResourceDataDocument<ExistingResourceObject<string>>>
  | null): CollectionResourceDataDocument;
```

#### Call Signature

```ts
didCommit(cacheKey: ResourceKey, result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:335](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L335)

\[LIFECYCLE] Signals to the cache that a resource
was successfully updated as part of a save transaction.

##### Parameters

###### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

the primary ResourceKey that was operated on

###### result

| [`StructuredDataDocument`](../../request/types/StructuredDataDocument.md)<[`SingleResourceDataDocument`](../../spec/document/types/SingleResourceDataDocument.md)<[`ExistingResourceObject`](../../spec/json-api-raw/types/ExistingResourceObject.md)<`string`>, [`ExistingResourceObject`](../../spec/json-api-raw/types/ExistingResourceObject.md)<`string`>>>
| `null`

a document in the cache format containing any updated data

##### Returns

[`SingleResourceDataDocument`](../../spec/document/types/SingleResourceDataDocument.md)

#### Call Signature

```ts
didCommit(cacheKey: ResourceKey[], result: 
  | StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject<string>, ExistingResourceObject<string>>>
  | null): SingleResourceDataDocument;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:348](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L348)

\[LIFECYCLE] Signals to the cache that a set of resources
was successfully updated as part of a save transaction that
resulted in a single resource being returned.

##### Parameters

###### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)\[]

the primary ResourceKeys that were operated on

###### result

| [`StructuredDataDocument`](../../request/types/StructuredDataDocument.md)<[`SingleResourceDataDocument`](../../spec/document/types/SingleResourceDataDocument.md)<[`ExistingResourceObject`](../../spec/json-api-raw/types/ExistingResourceObject.md)<`string`>, [`ExistingResourceObject`](../../spec/json-api-raw/types/ExistingResourceObject.md)<`string`>>>
| `null`

a document in the cache format containing any updated data

##### Returns

[`SingleResourceDataDocument`](../../spec/document/types/SingleResourceDataDocument.md)

#### Call Signature

```ts
didCommit(cacheKey: ResourceKey[], result: 
  | StructuredDataDocument<CollectionResourceDataDocument<ExistingResourceObject<string>>>
  | null): CollectionResourceDataDocument;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:361](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L361)

\[LIFECYCLE] Signals to the cache that a set of resources
was successfully updated as part of a save transaction that
resulted in a collection of resources being returned.

##### Parameters

###### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)\[]

the primary ResourceKeys that were operated on

###### result

| [`StructuredDataDocument`](../../request/types/StructuredDataDocument.md)<[`CollectionResourceDataDocument`](../../spec/document/types/CollectionResourceDataDocument.md)<[`ExistingResourceObject`](../../spec/json-api-raw/types/ExistingResourceObject.md)<`string`>>>
| `null`

a document in the cache format containing any updated data

##### Returns

[`CollectionResourceDataDocument`](../../spec/document/types/CollectionResourceDataDocument.md)

***

### diff()

```ts
diff(): Promise<Change[]>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:275](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L275)

Generate the list of changes applied to all
record in the store.

Each individual resource or document that has been mutated
should be described as an individual [Change](../change/types/Change.md) entry
in the returned array.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`Change`](../change/types/Change.md)\[]>

***

### dump()

```ts
dump(): Promise<ReadableStream<unknown>>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:288](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L288)

Serialize the entire contents of the Cache into a Stream
which may be fed back into a new instance of the same Cache
via `cache.hydrate`.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`unknown`>>

***

### fork()

```ts
fork(): Promise<Cache>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:253](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L253)

Create a fork of the cache from the current state.

Applications should typically not call this method themselves,
preferring instead to fork at the Store level, which will
utilize this method to fork the cache.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`Cache`>

***

### getAttr()

```ts
getAttr(cacheKey: ResourceKey, field: string | string[]): Value | undefined;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:392](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L392)

Retrieve the data for an attribute from the cache

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### field

`string` | `string`\[]

#### Returns

[`Value`](../../json/raw/types/Value.md) | `undefined`

***

### getErrors()

```ts
getErrors(cacheKey: ResourceKey): ApiError[];
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:510](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L510)

Query the cache for any validation errors applicable to the given resource.

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

[`ApiError`](../../spec/error/types/ApiError.md)\[]

***

### getRelationship()

```ts
getRelationship(
   cacheKey: ResourceKey, 
   field: string, 
   isCollection?: boolean
): 
  | ResourceRelationship<ResourceKey>
| CollectionRelationship<ResourceKey>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:474](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L474)

Query the cache for the current state of a relationship property

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### field

`string`

##### isCollection?

`boolean`

#### Returns

| [`ResourceRelationship`](../relationship/types/ResourceRelationship.md)<[`ResourceKey`](../../identifier/types/ResourceKey.md)>
| [`CollectionRelationship`](../relationship/types/CollectionRelationship.md)<[`ResourceKey`](../../identifier/types/ResourceKey.md)>

resource relationship object

***

### getRemoteAttr()

```ts
getRemoteAttr(cacheKey: ResourceKey, field: string | string[]): Value | undefined;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:399](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L399)

Retrieve remote state without any local changes for a specific attribute

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### field

`string` | `string`\[]

#### Returns

[`Value`](../../json/raw/types/Value.md) | `undefined`

***

### getRemoteRelationship()

```ts
getRemoteRelationship(
   cacheKey: ResourceKey, 
   field: string, 
   isCollection?: boolean
): 
  | ResourceRelationship<ResourceKey>
| CollectionRelationship<ResourceKey>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:486](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L486)

Query the cache for the server state of a relationship property without any local changes

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### field

`string`

##### isCollection?

`boolean`

#### Returns

| [`ResourceRelationship`](../relationship/types/ResourceRelationship.md)<[`ResourceKey`](../../identifier/types/ResourceKey.md)>
| [`CollectionRelationship`](../relationship/types/CollectionRelationship.md)<[`ResourceKey`](../../identifier/types/ResourceKey.md)>

resource relationship object

***

### hasChangedAttrs()

```ts
hasChangedAttrs(cacheKey: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:428](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L428)

Query the cache for whether any mutated attributes exist

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### hasChangedRelationships()

```ts
hasChangedRelationships(cacheKey: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:454](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L454)

Query the cache for whether any mutated attributes exist

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### hydrate()

```ts
hydrate(stream: ReadableStream<unknown>): Promise<void>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:304](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L304)

hydrate a Cache from a Stream with content previously serialized
from another instance of the same Cache, resolving when hydration
is complete.

This method should expect to be called both in the context of restoring
the Cache during application rehydration after SSR **AND** at unknown
times during the lifetime of an already booted application when it is
desired to bulk-load additional information into the cache. This latter
behavior supports optimizing pre/fetching of data for route transitions
via data-only SSR modes.

#### Parameters

##### stream

[`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`unknown`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### isDeleted()

```ts
isDeleted(cacheKey: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:533](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L533)

Query the cache for whether a given resource is marked as deleted (but not
necessarily persisted yet).

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### isDeletionCommitted()

```ts
isDeletionCommitted(cacheKey: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:541](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L541)

Query the cache for whether a given resource has been deleted and that deletion
has also been persisted.

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### isEmpty()

```ts
isEmpty(cacheKey: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:517](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L517)

Query the cache for whether a given resource has any available data

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### isNew()

```ts
isNew(cacheKey: ResourceKey): boolean;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:525](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L525)

Query the cache for whether a given resource was created locally and not
yet persisted.

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`boolean`

***

### merge()

```ts
merge(cache: Cache): Promise<void>;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:263](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L263)

Merge a fork back into a parent Cache.

Applications should typically not call this method themselves,
preferring instead to merge at the Store level, which will
utilize this method to merge the caches.

#### Parameters

##### cache

`Cache`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### mutate()

```ts
mutate(mutation: Mutation): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:133](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L133)

Update the "local" or "current" (unpersisted) state of the Cache

#### Parameters

##### mutation

[`Mutation`](../mutations/types/Mutation.md)

#### Returns

`void`

***

### patch()

```ts
patch(op: 
  | Operation
  | Operation[]): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:126](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L126)

Update the "remote" or "canonical" (persisted) state of the Cache
by merging new information into the existing state.

#### Parameters

##### op

| [`Operation`](../operations/types/Operation.md)
| [`Operation`](../operations/types/Operation.md)\[]

the operation(s) to perform

#### Returns

`void`

***

### peek()

```ts
peek<T = unknown>(cacheKey: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
peek(cacheKey: RequestKey): 
  | ResourceDocument
  | null;
```

#### Call Signature

```ts
peek<T = unknown>(cacheKey: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:165](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L165)

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

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)<[`TypeFromInstanceOrString`](../../record/types/TypeFromInstanceOrString.md)<`T`>>

##### Returns

`T` | `null`

the known resource data, if any

#### Call Signature

```ts
peek(cacheKey: RequestKey): 
  | ResourceDocument
  | null;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:172](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L172)

Peek the Cache for the [document](../../spec/document/types/ResourceDocument.md) associated with a request.

##### Parameters

###### cacheKey

[`RequestKey`](../../identifier/types/RequestKey.md)

##### Returns

| [`ResourceDocument`](../../spec/document/types/ResourceDocument.md)
| `null`

the known document data, if any

***

### peekRemoteState()

```ts
peekRemoteState<T = unknown>(cacheKey: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
peekRemoteState(cacheKey: RequestKey): 
  | ResourceDocument
  | null;
```

#### Call Signature

```ts
peekRemoteState<T = unknown>(cacheKey: ResourceKey<TypeFromInstanceOrString<T>>): T | null;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:206](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L206)

Peek remote resource data from the Cache.

This will give the data provided from the server without any local changes.

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

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)<[`TypeFromInstanceOrString`](../../record/types/TypeFromInstanceOrString.md)<`T`>>

##### Returns

`T` | `null`

the known data, if any

#### Call Signature

```ts
peekRemoteState(cacheKey: RequestKey): 
  | ResourceDocument
  | null;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:215](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L215)

Peek remote [document](../../spec/document/types/ResourceDocument.md) data for a request from the Cache.

This will give the data provided from the server without any local changes.

##### Parameters

###### cacheKey

[`RequestKey`](../../identifier/types/RequestKey.md)

##### Returns

| [`ResourceDocument`](../../spec/document/types/ResourceDocument.md)
| `null`

the known document data, if any

***

### peekRequest()

```ts
peekRequest(cacheKey: RequestKey): 
  | StructuredDocument<ResourceDocument>
  | null;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:227](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L227)

Peek the Cache for the existing request data associated with
a cacheable request

This is effectively the reverse of `put` for a request in
that it will return the the request, response, and content
whereas `peek` will return just the `content`.

#### Parameters

##### cacheKey

[`RequestKey`](../../identifier/types/RequestKey.md)

#### Returns

| [`StructuredDocument`](../../request/types/StructuredDocument.md)<[`ResourceDocument`](../../spec/document/types/ResourceDocument.md)>
| `null`

***

### put()

```ts
put<T>(doc: 
  | StructuredDocument<T>
  | {
  content: T;
}): ResourceDocument;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:117](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L117)

Cache the response to a request

Unlike `store.push` which has UPSERT
semantics, `put` has `replace` semantics similar to
the `http` method `PUT`

the individually cacheable resource data it may contain
should upsert, but the document data surrounding it should
fully replace any existing information

Note that in order to support inserting arbitrary data
to the cache that did not originate from a request `put`
should expect to sometimes encounter a document with only
a `content` member and therefor must not assume the existence
of `request` and `response` on the document.

#### Type Parameters

##### T

`T`

#### Parameters

##### doc

| [`StructuredDocument`](../../request/types/StructuredDocument.md)<`T`>
| {
`content`: `T`;
}

#### Returns

[`ResourceDocument`](../../spec/document/types/ResourceDocument.md)

***

### rollbackAttrs()

```ts
rollbackAttrs(cacheKey: ResourceKey): string[];
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:438](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L438)

Tell the cache to discard any uncommitted mutations to attributes

This method is a candidate to become a mutation

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`string`\[]

the names of fields that were restored

***

### rollbackRelationships()

```ts
rollbackRelationships(cacheKey: ResourceKey): string[];
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:466](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L466)

Tell the cache to discard any uncommitted mutations to relationships.

This will also discard the change on any appropriate inverses.

This method is a candidate to become a mutation

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`string`\[]

the names of relationships that were restored

***

### setAttr()

```ts
setAttr(
   cacheKey: ResourceKey, 
   field: string | string[], 
   value: Value
): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:408](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L408)

Mutate the data for an attribute in the cache

This method is a candidate to become a mutation

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### field

`string` | `string`\[]

##### value

[`Value`](../../json/raw/types/Value.md)

#### Returns

`void`

***

### setIsDeleted()

```ts
setIsDeleted(cacheKey: ResourceKey, isDeleted: boolean): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:503](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L503)

Update the cache state for the given resource to be marked
as locally deleted, or remove such a mark.

This method is a candidate to become a mutation

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### isDeleted

`boolean`

#### Returns

`void`

***

### unloadRecord()

```ts
unloadRecord(cacheKey: ResourceKey): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:382](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L382)

\[LIFECYCLE] Signals to the cache that all data for a resource
should be cleared.

This method is a candidate to become a mutation

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

#### Returns

`void`

***

### upsert()

```ts
upsert(
   cacheKey: ResourceKey, 
   data: unknown, 
   hasRecord: boolean
): void | string[];
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:239](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L239)

Push resource data from a remote source into the cache for this ResourceKey

#### Parameters

##### cacheKey

[`ResourceKey`](../../identifier/types/ResourceKey.md)

##### data

`unknown`

##### hasRecord

`boolean`

#### Returns

`void` | `string`\[]

when `hasRecord` is true, the names of the attributes whose persisted value
this push changed, or `undefined` when none did. A key counts as changed when the
value the cache holds for it moved, whether or not a local edit already held the new
value; a value the schema considers equal (for instance, a schema-object with a
matching identity hash) does not count. Otherwise `void`.

***

### willCommit()

```ts
willCommit(cacheKey: 
  | ResourceKey
  | ResourceKey[], context: RequestContext | null): void;
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:325](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L325)

\[LIFECYCLE] Signals to the cache that a resource
will be part of a save transaction.

#### Parameters

##### cacheKey

| [`ResourceKey`](../../identifier/types/ResourceKey.md)
| [`ResourceKey`](../../identifier/types/ResourceKey.md)\[]

##### context

[`RequestContext`](../../request/types/RequestContext.md) | `null`

#### Returns

`void`

## Properties

### version

```ts
version: "2";
```

Defined in: [warp-drive-packages/core/src/types/cache.ts:93](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache.ts#L93)

The Cache Version that this implementation implements.
