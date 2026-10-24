---
url: >-
  https://canary.warp-drive.io/api/@warp-drive/experiments/pagination/functions/clearPaginationCache.md
description: >-
  Experimental: discards every shared pagination cache, mainly so tests start
  from a clean state.
---

&#x20;

# &#x20;clearPaginationCache()&#x20;

```ts
function clearPaginationCache(): void;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:279](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/signals/pagination-cache.ts#L279)

Clears the module-level pagination cache used by [getPaginationCache](getPaginationCache.md).
Primarily intended for test isolation, since the cache is keyed by url and
otherwise persists for the lifetime of the module.

## Returns

`void`
