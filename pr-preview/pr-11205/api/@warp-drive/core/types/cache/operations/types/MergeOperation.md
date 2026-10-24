---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/cache/operations/types/MergeOperation.md
---

# &#x20;MergeOperation

```ts
interface MergeOperation extends Op {
  op: "mergeIdentifiers";
  record: ResourceKey;
  value: ResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:45](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L45)

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

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:46](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L46)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:51](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L51)

The stale [ResourceKey](../../../identifier/types/ResourceKey.md) that
the cache should eliminate in favor of [value](#value)

***

### value

```ts
value: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:56](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L56)

The kept [ResourceKey](../../../identifier/types/ResourceKey.md) that
the cache should also keep and merge [record](#record) into.
