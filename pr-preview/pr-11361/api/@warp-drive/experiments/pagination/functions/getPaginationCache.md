---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/experiments/pagination/functions/getPaginationCache.md
description: >-
  Experimental: returns the shared pagination cache for a collection's `first`
  or `self` link, creating it on first use.
---

&#x20;

# &#x20;getPaginationCache()&#x20;

```ts
function getPaginationCache<RT, E>(key: string): PaginationCache<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:259](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/pagination-cache.ts#L259)

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
