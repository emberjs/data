---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/legacy/compat/builders/functions/findAll.md
description: >-
  Deprecated legacy builder for a `store.request` config that behaves like
  `store.findAll`, easing migration off adapters and serializers.
---

&#x20;

# &#x20;~~findAll()~~

```ts
function findAll<T extends TypedRecordInstance>(type: TypeFromInstance<T>, options?: BaseFinderOptions): FindAllRequestInput<TypeFromInstance<T>, T[]>;
function findAll(type: string, options?: BaseFinderOptions): FindAllRequestInput;
```

## Call Signature&#x20;

```ts
function findAll<T extends TypedRecordInstance>(type: TypeFromInstance<T>, options?: BaseFinderOptions): FindAllRequestInput<TypeFromInstance<T>, T[]>;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-all.ts:38](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/compat/builders/find-all.ts#L38)

This function builds a request config to perform a `findAll` request for the given type.
When passed to `store.request`, this config will result in the same behavior as a `store.findAll` request.
Additionally, it takes the same options as `store.findAll`.

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

#### options?

`BaseFinderOptions`

optional, may include `adapterOptions` hash which will be passed to adapter.findAll

### Returns

`FindAllRequestInput`<[`TypeFromInstance`](../../../../core/types/record/types/TypeFromInstance.md)<`T`>, `T`\[]>

request config

### Deprecated

## Call Signature&#x20;

```ts
function findAll(type: string, options?: BaseFinderOptions): FindAllRequestInput;
```

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-all.ts:42](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/compat/builders/find-all.ts#L42)

This function builds a request config to perform a `findAll` request for the given type.
When passed to `store.request`, this config will result in the same behavior as a `store.findAll` request.
Additionally, it takes the same options as `store.findAll`.

All `@warp-drive/legacy/compat` builders exist to enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of WarpDrive.

### Parameters

#### type

`string`

the name of the resource

#### options?

`BaseFinderOptions`

optional, may include `adapterOptions` hash which will be passed to adapter.findAll

### Returns

`FindAllRequestInput`

request config

### Deprecated
