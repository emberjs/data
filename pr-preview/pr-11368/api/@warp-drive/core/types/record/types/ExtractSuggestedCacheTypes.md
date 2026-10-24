---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/record/types/ExtractSuggestedCacheTypes.md
description: >-
  Type utility giving the union of resource types reachable from a typed record
  through its relationships, up to a max depth.
---

# &#x20;ExtractSuggestedCacheTypes\<T *extends* [`TypedRecordInstance`](TypedRecordInstance.md), MAX\_DEPTH *extends* `_DEPTHCOUNT` = `DEFAULT_MAX_DEPTH`>

```ts
type ExtractSuggestedCacheTypes<T extends TypedRecordInstance, MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH> = ExtractUnion<MAX_DEPTH, T>;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:169](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/record.ts#L169)

A utility that provides the union of all ResourceName for all potential
includes for the given TypedRecordInstance.

## Type Parameters

### T

`T` *extends* [`TypedRecordInstance`](TypedRecordInstance.md)

### MAX\_DEPTH

`MAX_DEPTH` *extends* `_DEPTHCOUNT` = `DEFAULT_MAX_DEPTH`
