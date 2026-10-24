---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/functions/clearPaginationCache.md
---

# &#x20;clearPaginationCache()&#x20;

```ts
function clearPaginationCache(): void;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:265](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-cache.ts#L265)

Clears the module-level pagination cache used by [getPaginationCache](getPaginationCache.md).
Primarily intended for test isolation, since the cache is keyed by url and
otherwise persists for the lifetime of the module.

## Returns

`void`
