---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/experiments/pagination/functions/getPaginationCache.md
---

&#x20;

# &#x20;getPaginationCache()&#x20;

```ts
function getPaginationCache<RT, E>(key: string): PaginationCache<RT, E>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:190](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L190)

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
