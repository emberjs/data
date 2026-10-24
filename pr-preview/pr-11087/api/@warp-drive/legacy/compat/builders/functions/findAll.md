---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/legacy/compat/builders/functions/findAll.md
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

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-all.ts:36](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/compat/builders/find-all.ts#L36)

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

Defined in: [warp-drive-packages/legacy/src/compat/builders/find-all.ts:40](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/compat/builders/find-all.ts#L40)

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
