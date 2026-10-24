---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/types/cache/operations/types/RemoveResourceOperation.md
description: >-
  Cache operation passed to `cache.patch` that removes a resource as if deleted
  remotely, eliminating all references to it.
---

# &#x20;RemoveResourceOperation

```ts
interface RemoveResourceOperation extends Op {
  op: "remove";
  record: PersistedResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:88](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L88)

Removes a resource from the cache. This is treated
as if a remote deletion has occurred, and all references
to the resource should be eliminated.

## Extends

* [`Op`](Op.md)

## Properties

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:89](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L89)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:93](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L93)

The cache key for the resource
