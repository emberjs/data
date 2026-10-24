---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/types/request/variables/SkipCache.md
description: >-
  Symbol key for a request's `cacheOptions` that, when true, makes the request
  bypass the CacheHandler so it neither resolves from nor updates the cache.
---

# &#x20;SkipCache

```ts
const SkipCache: "___(unique) Symbol(SkipCache)";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:36](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/request.ts#L36)

A [cacheOptions](../types/RequestInfo.md#cacheoptions) flag which, when set,
signals that a request should never be handled by the cache-manager and
thus will never resolve from cache nor update the cache.
