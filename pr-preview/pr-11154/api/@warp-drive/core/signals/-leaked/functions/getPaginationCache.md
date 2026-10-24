---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/functions/getPaginationCache.md
---

# &#x20;getPaginationCache()&#x20;

```ts
function getPaginationCache<RT, E>(key: string): PaginationCache<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:246](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-cache.ts#L246)

Get the shared [PaginationCache](../types/PaginationCache.md) for a given cache key (the collection's
`first` or `self` link). Returns the same instance for the same key for the
lifetime of the module.

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### key

`string`

## Returns

[`PaginationCache`](../types/PaginationCache.md)<`RT`, `E`>
