---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/compat/builders/functions/query.md
---

&#x20;

# &#x20;~~query()~~

```ts
function query<T extends TypedRecordInstance>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRequestInput<TypeFromInstance<T>, T[]>;
function query(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRequestInput;
```

## Call Signature&#x20;

```ts
function query<T extends TypedRecordInstance>(
   type: TypeFromInstance<T>, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRequestInput<TypeFromInstance<T>, T[]>;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/query.ts:38](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/compat/builders/query.ts#L38)

This function builds a request config for a given type and query object.
When passed to `store.request`, this config will result in the same behavior as a `store.query` request.
Additionally, it takes the same options as `store.query`.

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

`QueryRequestInput`<[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>, `T`\[]>

request config

### Deprecated

## Call Signature&#x20;

```ts
function query(
   type: string, 
   query: LegacyResourceQuery, 
   options?: QueryOptions
): QueryRequestInput;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/query.ts:43](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/compat/builders/query.ts#L43)

This function builds a request config for a given type and query object.
When passed to `store.request`, this config will result in the same behavior as a `store.query` request.
Additionally, it takes the same options as `store.query`.

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

`QueryRequestInput`

request config

### Deprecated
