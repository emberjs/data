---
url: https://canary.warp-drive.io/api/@warp-drive/json-api.md
description: >-
  The recommended in-memory JSON:API document and resource cache for WarpDrive,
  `JSONAPICache`, which most apps pass to `useRecommendedStore`.
---

:::tip 💡 TIP
**Most apps should use this Cache implementation**.
:::

This package provides an in-memory [{json:api}](https://jsonapi.org/) document and resource [Cache](/api/@warp-drive/core/types/cache/types/Cache).

`{json:api}` excels at simplifying common complex problems around cache consistency
and information density, especially in regards to relational or polymorphic data.

Because most API responses can be quickly transformed into the `{json:api}` format without losing any information, ***Warp*Drive** recommends that **most-if-not-all apps should use this Cache implementation**.

Do you really need a cache? Caching does more than allow you to replay requests.
Caching is what powers features like immutability, mutation management, and allows ***Warp*Drive** to understand your relational data.

Some caches are simple request/response maps. ***Warp*Drive**'s is not. The Cache deeply understands the structure of your data, ensuring your data remains consistent both within and across requests.

## Simple Setup

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export const AppStore = useRecommendedStore({
  cache: JSONAPICache,
  schemas: [
    // ... your schemas here
  ]
});
```

## Advanced/Manual Setup

```ts
import { Store } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export class AppStore extends Store {
  createCache(capabilities) {
    return new JSONAPICache(capabilities);
  }
}
```

## Guides

* [Installation](/guides/installation/): install `@warp-drive/json-api` alongside
  `@warp-drive/core`.
* [Setup](/guides/configuration/#configure-the-store): pass `JSONAPICache` to the Store.
* [Advanced Store Configuration](/guides/configuration/advanced.md#add-a-cache): add the cache to
  a Store you build by hand.
* [Caching](/guides/the-manual/caching/): how the `JSONAPICache` stores responses, resources,
  fields and relationships, and which of them a new value replaces rather than merges into.
* [Schemas](/guides/the-manual/schemas/): how a resource in the `{json:api}` format maps onto a
  schema.
* [Handlers](/guides/the-manual/requests/handlers.md): normalize a REST response into a
  `{json:api}` document the cache can consume.
* [Relationships](/guides/the-manual/relational-data/): configure the relationships the cache
  keeps consistent.
* [Polymorphism](/guides/the-manual/relational-data/features/polymorphism.md): polymorphic
  relationships and resolving an abstract type to a concrete one.

## Classes

* [JSONAPICache](classes/JSONAPICache.md)
