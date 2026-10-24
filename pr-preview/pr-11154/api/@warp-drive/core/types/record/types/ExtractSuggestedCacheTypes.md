---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/record/types/ExtractSuggestedCacheTypes.md
---

# &#x20;ExtractSuggestedCacheTypes\<T *extends* [`TypedRecordInstance`](TypedRecordInstance.md), MAX\_DEPTH *extends* `_DEPTHCOUNT` = `DEFAULT_MAX_DEPTH`>

```ts
type ExtractSuggestedCacheTypes<T extends TypedRecordInstance, MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH> = ExtractUnion<MAX_DEPTH, T>;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:157](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/record.ts#L157)

A utility that provides the union of all ResourceName for all potential
includes for the given TypedRecordInstance.

## Type Parameters

### T

`T` *extends* [`TypedRecordInstance`](TypedRecordInstance.md)

### MAX\_DEPTH

`MAX_DEPTH` *extends* `_DEPTHCOUNT` = `DEFAULT_MAX_DEPTH`
