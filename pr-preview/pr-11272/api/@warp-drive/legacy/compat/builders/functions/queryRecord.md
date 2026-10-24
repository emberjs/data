---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/compat/builders/functions/queryRecord.md
---

&#x20;

# &#x20;~~queryRecord()~~

```ts
function queryRecord<T extends TypedRecordInstance>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRecordRequestInput<TypeFromInstance<T>, T | null>;
function queryRecord(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRecordRequestInput;
```

## Call Signature&#x20;

```ts
function queryRecord<T extends TypedRecordInstance>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRecordRequestInput<TypeFromInstance<T>, T | null>;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/query.ts:97](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/compat/builders/query.ts#L97)

This function builds a request config for a given type and query object.
When passed to `store.request`, this config will result in the same behavior as a `store.queryRecord` request.
Additionally, it takes the same options as `store.queryRecord`.

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of WarpDrive.

### Type Parameters

#### T

`T` *extends* [`TypedRecordInstance`](../../../../core/types/record/types/TypedRecordInstance.md)

### Parameters

#### type

[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>

the name of the resource

#### query

`LegacyResourceQuery`

a query to be used by the adapter

#### options?

`QueryOptions`

optional, may include `adapterOptions` hash which will be passed to adapter.query

### Returns

`QueryRecordRequestInput`<[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>, `T` | `null`>

request config

### Deprecated

## Call Signature&#x20;

```ts
function queryRecord(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRecordRequestInput;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/query.ts:102](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/compat/builders/query.ts#L102)

This function builds a request config for a given type and query object.
When passed to `store.request`, this config will result in the same behavior as a `store.queryRecord` request.
Additionally, it takes the same options as `store.queryRecord`.

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of WarpDrive.

### Parameters

#### type

`string`

the name of the resource

#### query

`LegacyResourceQuery`

a query to be used by the adapter

#### options?

`QueryOptions`

optional, may include `adapterOptions` hash which will be passed to adapter.query

### Returns

`QueryRecordRequestInput`

request config

### Deprecated
