---
url: https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core.md
---

***Warp*Drive** is the lightweight data library for web apps: universal, typed, reactive, and
ready to scale. This package is its core: the [Store](classes/Store.md) that holds
your data, the [RequestManager](classes/RequestManager.md) that fetches it through a
chain of handlers (each a function or object that can fulfill, modify, or pass along a request),
the [Cache](/api/@warp-drive/core/types/cache/types/Cache) interface a cache implementation
fills in, and the reactive objects that present cached data to your UI.

:::tip New here?
Start with the [Installation](/guides/installation/) and [Setup](/guides/configuration/) guides.
The API docs assume that context.
:::

## Setup

[useRecommendedStore](functions/useRecommendedStore.md) produces a Store class with the
recommended defaults for schema handling, reactivity, caching, and request management, including a
RequestManager already wired with `Fetch` and `CacheHandler`. Pair it with a
cache implementation; most apps should use [@warp-drive/json-api](../json-api/index.md).

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export const AppStore = useRecommendedStore({
  cache: JSONAPICache,
  schemas: [
    // one schema per resource type, see /guides/the-manual/schemas/
  ],
});
```

`AppStore` is a class. The [Setup guide](/guides/configuration/) shows how each framework
instantiates it and makes it available to components, and how to configure the
[build plugin](/api/@warp-drive/core/build-config/) every ***Warp*Drive** app needs. Schemas
describe the shape of your resources; the [Schemas guide](/guides/the-manual/schemas/) covers
writing them.

## Entry Points

* `@warp-drive/core`: the Store, RequestManager, the `Fetch` handler that performs the network
  request and the `CacheHandler` that reads and writes the cache, and `useRecommendedStore`.
* [`@warp-drive/core/request`](/api/@warp-drive/core/request/): request and handler primitives,
  such as `withResponseType`.
* [`@warp-drive/core/reactive`](/api/@warp-drive/core/reactive/): the reactive objects a Store
  uses to present requests, resources, and relationships from the cache.
* [`@warp-drive/core/store`](/api/@warp-drive/core/store/): the pieces for customizing a Store
  beyond the recommended defaults, such as the cache policy that decides when cached data is stale.
* [`@warp-drive/core/types`](/api/@warp-drive/core/types/): the types, type utilities, symbols and
  constants shared across the ***Warp*Drive** ecosystem, including the Cache interface.
* [`@warp-drive/core/build-config`](/api/@warp-drive/core/build-config/): the build plugin that
  configures deprecations, optional features, and debug logging.
* [`@warp-drive/core/configure`](/api/@warp-drive/core/configure/): the API for telling
  ***Warp*Drive** which framework's reactivity system to use.

## Classes

* [ConfiguredStore](classes/ConfiguredStore.md)
* [RequestManager](classes/RequestManager.md)
* [Store](classes/Store.md)

## Variables

* [CacheHandler](variables/CacheHandler.md)
* [Fetch](variables/Fetch.md)

## Functions

### cacheKeyFor

Renames and re-exports [recordIdentifierFor](functions/recordIdentifierFor.md)

## Types

* [CachePolicy](types/CachePolicy.md)
* [StoreRequestContext](types/StoreRequestContext.md)
* [StoreSetupOptions](types/StoreSetupOptions.md)
* [CacheOperation](types/CacheOperation.md)
* [~~Document~~](types/Document.md)
* [DocumentCacheOperation](types/DocumentCacheOperation.md)
* [NotificationChannel](types/NotificationChannel.md)
* [NotificationType](types/NotificationType.md)
* [NotifyKeys](types/NotifyKeys.md)
* [StoreRequestInput](types/StoreRequestInput.md)
