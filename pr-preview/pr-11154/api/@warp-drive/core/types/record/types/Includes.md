---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/record/types/Includes.md
---

# &#x20;Includes\<T *extends* [`TypedRecordInstance`](TypedRecordInstance.md), MAX\_DEPTH *extends* `_DEPTHCOUNT` = `DEFAULT_MAX_DEPTH`>

```ts
type Includes<T extends TypedRecordInstance, MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH> = ExtractUnion<MAX_DEPTH, T, true>;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:169](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/record.ts#L169)

A utility that provides the union type of all valid include paths for the given
TypedRecordInstance.

Cyclical paths are filtered out.

## Type Parameters

### T

`T` *extends* [`TypedRecordInstance`](TypedRecordInstance.md)

### MAX\_DEPTH

`MAX_DEPTH` *extends* `_DEPTHCOUNT` = `DEFAULT_MAX_DEPTH`
