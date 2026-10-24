---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/compat/builders/functions/findRecord.md
---

&#x20;

# &#x20;~~findRecord()~~

```ts
function findRecord<T extends TypedRecordInstance>(
   type: TypeFromInstance<T>, 
   id: string, 
   options?: FindRecordBuilderOptions
): FindRecordRequestInput<TypeFromInstance<T>, T>;
function findRecord(
   type: string, 
   id: string, 
   options?: FindRecordBuilderOptions
): FindRecordRequestInput;
function findRecord<T extends TypedRecordInstance>(resource: ResourceIdentifierObject<TypeFromInstance<T>>, options?: FindRecordBuilderOptions): FindRecordRequestInput<TypeFromInstance<T>, T>;
function findRecord(resource: ResourceIdentifierObject, options?: FindRecordBuilderOptions): FindRecordRequestInput;
```

## Call Signature&#x20;

```ts
function findRecord<T extends TypedRecordInstance>(
   type: TypeFromInstance<T>, 
   id: string, 
   options?: FindRecordBuilderOptions
): FindRecordRequestInput<TypeFromInstance<T>, T>;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-record.ts:57](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/builders/find-record.ts#L57)

This function builds a request config to find the record for a given identifier or type and id combination.
When passed to `store.request`, this config will result in the same behavior as a `store.findRecord` request.
Additionally, it takes the same options as `store.findRecord`, with the exception of `preload` (which is unsupported).

**Example 1**

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>('post', '1'));
```

**Example 2**

`findRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id }));
```

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of Warp Drive.

### Type Parameters

#### T

`T` *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)

### Parameters

#### type

[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>

#### id

`string`

optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved

#### options?

`FindRecordBuilderOptions`

if the first param is a string this will be the optional options for the request. See examples for available options.

### Returns

`FindRecordRequestInput`<[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>, `T`>

request config

### Deprecated

## Call Signature&#x20;

```ts
function findRecord(
   type: string, 
   id: string, 
   options?: FindRecordBuilderOptions
): FindRecordRequestInput;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-record.ts:62](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/builders/find-record.ts#L62)

This function builds a request config to find the record for a given identifier or type and id combination.
When passed to `store.request`, this config will result in the same behavior as a `store.findRecord` request.
Additionally, it takes the same options as `store.findRecord`, with the exception of `preload` (which is unsupported).

**Example 1**

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>('post', '1'));
```

**Example 2**

`findRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id }));
```

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of Warp Drive.

### Parameters

#### type

`string`

#### id

`string`

optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved

#### options?

`FindRecordBuilderOptions`

if the first param is a string this will be the optional options for the request. See examples for available options.

### Returns

`FindRecordRequestInput`

request config

### Deprecated

## Call Signature&#x20;

```ts
function findRecord<T extends TypedRecordInstance>(resource: ResourceIdentifierObject<TypeFromInstance<T>>, options?: FindRecordBuilderOptions): FindRecordRequestInput<TypeFromInstance<T>, T>;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-record.ts:63](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/builders/find-record.ts#L63)

This function builds a request config to find the record for a given identifier or type and id combination.
When passed to `store.request`, this config will result in the same behavior as a `store.findRecord` request.
Additionally, it takes the same options as `store.findRecord`, with the exception of `preload` (which is unsupported).

**Example 1**

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>('post', '1'));
```

**Example 2**

`findRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id }));
```

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of Warp Drive.

### Type Parameters

#### T

`T` *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)

### Parameters

#### resource

[`ResourceIdentifierObject`](../../../../core/types/spec/json-api-raw/types/ResourceIdentifierObject.md)<[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>>

either a string representing the name of the resource or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record

#### options?

`FindRecordBuilderOptions`

if the first param is a string this will be the optional options for the request. See examples for available options.

### Returns

`FindRecordRequestInput`<[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>, `T`>

request config

### Deprecated

## Call Signature&#x20;

```ts
function findRecord(resource: ResourceIdentifierObject, options?: FindRecordBuilderOptions): FindRecordRequestInput;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-record.ts:67](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/builders/find-record.ts#L67)

This function builds a request config to find the record for a given identifier or type and id combination.
When passed to `store.request`, this config will result in the same behavior as a `store.findRecord` request.
Additionally, it takes the same options as `store.findRecord`, with the exception of `preload` (which is unsupported).

**Example 1**

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>('post', '1'));
```

**Example 2**

`findRecord` can be called with a single identifier argument instead of the combination
of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

```ts
import { findRecord } from '@warp-drive/legacy/compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id }));
```

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of Warp Drive.

### Parameters

#### resource

[`ResourceIdentifierObject`](../../../../core/types/spec/json-api-raw/types/ResourceIdentifierObject.md)

either a string representing the name of the resource or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record

#### options?

`FindRecordBuilderOptions`

if the first param is a string this will be the optional options for the request. See examples for available options.

### Returns

`FindRecordRequestInput`

request config

### Deprecated
