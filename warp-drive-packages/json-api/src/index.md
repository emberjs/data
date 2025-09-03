# @warp-drive/json-api

:::tip 💡 TIP
**Most apps should use this Cache implementation**.
:::

This package provides an in-memory [{json:api}](https://jsonapi.org/) document and resource [Cache](/api/@warp-drive/core/types/cache/interfaces/Cache).

`{json:api}` excels at simplifying common complex problems around cache consistency 
and information density, especially in regards to relational or polymorphic data.

Because most API responses can be quickly transformed into the `{json:api}` format without losing any information, *Warp***Drive** recommends that **most-if-not-all apps should use this Cache implementation**.

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
