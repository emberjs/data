---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/cache/operations/types/AddResourceOperation.md
description: >-
  Cache operation passed to `cache.patch` that adds a persisted resource's data
  to the cache's remote state.
---

# &#x20;AddResourceOperation

```ts
interface AddResourceOperation extends Op {
  op: "add";
  record: PersistedResourceKey;
  value: ExistingResourceObject;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:102](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/operations.ts#L102)

Adds a resource to the cache.

## Extends

* [`Op`](Op.md)

## Properties

### op

```ts
op: "add";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:103](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/operations.ts#L103)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:107](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/operations.ts#L107)

The cache key for the resource

***

### value

```ts
value: ExistingResourceObject;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:111](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/operations.ts#L111)

The data for the resource
