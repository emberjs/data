---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/experiments/pagination/functions/getPaginationCache.md
description: >-
  Experimental: returns the shared pagination cache for a collection's `first`
  or `self` link, creating it on first use.
---

&#x20;

# &#x20;getPaginationCache()&#x20;

```ts
function getPaginationCache<RT, E>(key: string): PaginationCache<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:259](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/pagination-cache.ts#L259)

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
