---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/variables/CacheHandler.md
---

# &#x20;CacheHandler

```ts
const CacheHandler: CacheHandler;
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/handler.ts:96](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/cache-handler/handler.ts#L96)

A CacheHandler that adds support for using an WarpDrive Cache with a RequestManager.

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
