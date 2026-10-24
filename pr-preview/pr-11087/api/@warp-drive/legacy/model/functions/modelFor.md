---
url: /pr-preview/pr-11087/api/@warp-drive/legacy/model/functions/modelFor.md
---

&#x20;

# &#x20;modelFor()

```ts
function modelFor<T>(type: TypeFromInstance<T>): void | typeof Model;
function modelFor(type: string): void | typeof Model;
```

## Call Signature

```ts
function modelFor<T>(type: TypeFromInstance<T>): void | typeof Model;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/hooks.ts:71](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/model/-private/hooks.ts#L71)

The `modelFor` implementation for use with `Model`, exposed on the store
as `store.modelFor(type)` when the store is configured to use `Model`.
Returns the `Model` subclass registered for the given type, if any.

### Type Parameters

#### T

`T`

### Parameters

#### type

[`TypeFromInstance`](../../../core/types/record/types/TypeFromInstance.md)<`T`>

### Returns

`void` | *typeof* [`Model`](../classes/Model.md)

## Call Signature

```ts
function modelFor(type: string): void | typeof Model;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/hooks.ts:77](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/legacy/src/model/-private/hooks.ts#L77)

Overload accepting a raw type string instead of a typed record instance.

### Parameters

#### type

`string`

### Returns

`void` | *typeof* [`Model`](../classes/Model.md)
