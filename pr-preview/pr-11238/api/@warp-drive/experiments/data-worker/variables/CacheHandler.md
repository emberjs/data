---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/experiments/data-worker/variables/CacheHandler.md
description: >-
  Experimental cache handler for a DataWorker that serves requests from the
  in-memory or persisted cache and returns documents hydrated with their
  resources.
---

&#x20;

# &#x20;CacheHandler

```ts
const CacheHandler: CacheHandlerType;
```

Defined in: [warp-drive-packages/experiments/src/data-worker/cache-handler.ts:31](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/experiments/src/data-worker/cache-handler.ts#L31)

A simplified CacheHandler that hydrates ResourceDataDocuments from the cache
with their referenced resources.
