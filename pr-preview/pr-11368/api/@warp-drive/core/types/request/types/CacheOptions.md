---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/request/types/CacheOptions.md
description: >-
  Per-request settings on `cacheOptions` that control the cache key, forced or
  background reloads, invalidation by resource type, and cache bypass.
---

# &#x20;CacheOptions

```ts
interface CacheOptions {
  ___(unique) Symbol(SkipCache)?: boolean;
  backgroundReload?: boolean;
  key?: string;
  reload?: boolean;
  types?: string[];
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:84](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/request.ts#L84)

Use these options to adjust [CacheHandler](../../../variables/CacheHandler.md) behavior for a request
via [RequestInfo.cacheOptions](RequestInfo.md#cacheoptions).

## Properties

### \_\_\_(unique) Symbol(SkipCache)?

```ts
optional ___(unique) Symbol(SkipCache)?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:131](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/request.ts#L131)

If true, the request will never be handled by the cache-manager and thus
will never resolve from cache nor update the cache.

Generally this is only used for legacy request that manage resource cache
updates in a non-standard way via the LegacyNetworkHandler.

***

### backgroundReload?

```ts
optional backgroundReload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:102](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/request.ts#L102)

If true, and a cached response is present and not expired, the request
will be made in the background and the cached response will be returned.

***

### key?

```ts
optional key?: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:90](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/request.ts#L90)

A key that uniquely identifies this request. If not present, the url wil be used
as the key for any GET request, while all other requests will not be cached.

***

### reload?

```ts
optional reload?: boolean;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:96](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/request.ts#L96)

If true, the request will be made even if a cached response is present
and not expired.

***

### types?

```ts
optional types?: string[];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:121](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/request.ts#L121)

Useful for metadata around when to invalidate the cache. Typically used
by strategies that invalidate requests by resource type when a new resource
of that type has been created. See the CachePolicy implementation
provided by `@ember-data/request-utils` for an example.

It is recommended to only use this for query/queryRecord requests where
new records created later would affect the results, though using it for
findRecord requests is also supported if desired where it may be useful
when a create may affect the result of a sideloaded relationship.

Generally it is better to patch the cache directly for relationship updates
than to invalidate findRecord requests for one.
