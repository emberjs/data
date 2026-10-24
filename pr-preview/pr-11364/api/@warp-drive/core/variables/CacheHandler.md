---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/variables/CacheHandler.md
description: >-
  The RequestManager cache handler that serves, dedupes, and caches store
  requests and returns reactive documents when hydration is enabled.
---

# &#x20;CacheHandler

```ts
const CacheHandler: CacheHandler;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/handler.ts:105](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/store/-private/cache-handler/handler.ts#L105)

A CacheHandler that adds support for using an WarpDrive Cache with a RequestManager.

The [Caching](/guides/the-manual/caching/) guide explains how it decides whether a
request can use the cache.

This handler will only run when a request has supplied a `store` instance. Requests
issued by the store via `store.request()` will automatically have the `store` instance
attached to the request.

```ts
requestManager.request({
  store: store,
  url: '/api/posts',
  method: 'GET'
});
```

When this handler elects to handle a request, it will return the raw `StructuredDocument`
unless the request has `[EnableHydration]` set to `true`. In this case, the handler will
return a `Document` instance that will automatically update the UI when the cache is updated
in the future and will hydrate any identifiers in the StructuredDocument into Record instances.

When issuing a request via the store, \[EnableHydration] is automatically set to `true`. This
means that if desired you can issue requests that utilize the cache without needing to also
utilize Record instances if desired.

Said differently, you could elect to issue all requests via a RequestManager, without ever using
the store directly, by setting \[EnableHydration] to `true` and providing a store instance. Not
necessarily the most useful thing, but the decoupled nature of the RequestManager and incremental-feature
approach of WarpDrive allows for this flexibility.

```ts
import { EnableHydration } from '@warp-drive/core/types/request';

requestManager.request({
  store: store,
  url: '/api/posts',
  method: 'GET',
  [EnableHydration]: true
});
```
