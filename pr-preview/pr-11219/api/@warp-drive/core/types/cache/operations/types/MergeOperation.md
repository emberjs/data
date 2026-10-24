---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/types/cache/operations/types/MergeOperation.md
description: >-
  Cache operation telling the Cache that two resource keys refer to the same
  resource, so it can merge the stale one into the kept one.
---

# &#x20;MergeOperation

```ts
interface MergeOperation extends Op {
  op: "mergeIdentifiers";
  record: ResourceKey;
  value: ResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:52](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L52)

Occasionally the Store discovers that two previously
thought to be distinct resources refer to the same resource.

This operation will be performed, giving the Cache the chance
to cleanup and merge internal state as desired when this discovery
is made.

## Extends

* [`Op`](Op.md)

## Properties

### op

```ts
op: "mergeIdentifiers";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:53](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L53)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:58](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L58)

The stale [ResourceKey](../../../identifier/types/ResourceKey.md) that
the cache should eliminate in favor of [value](#value)

***

### value

```ts
value: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:63](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L63)

The kept [ResourceKey](../../../identifier/types/ResourceKey.md) that
the cache should also keep and merge [record](#record) into.
