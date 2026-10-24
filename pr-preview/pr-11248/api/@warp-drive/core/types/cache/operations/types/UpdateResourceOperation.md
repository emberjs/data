---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/cache/operations/types/UpdateResourceOperation.md
description: >-
  Cache operation passed to `cache.patch` that merges new remote state into a
  persisted resource.
---

# &#x20;UpdateResourceOperation

```ts
interface UpdateResourceOperation extends Op {
  op: "update";
  record: PersistedResourceKey;
  value: ExistingResourceObject;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:118](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L118)

Upserts (merges) new state for a resource

## Extends

* [`Op`](Op.md)

## Properties

### op

```ts
op: "update";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:119](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L119)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:123](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L123)

The cache key for the resource

***

### value

```ts
value: ExistingResourceObject;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:127](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L127)

The new state to merge into the resource
