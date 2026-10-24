---
url: https://canary.warp-drive.io/pr-preview/pr-11205/api/@ember-data/rest.md
---

:::warning ⚠️ This package only exists for backwards compatibility
It is for apps still on the `@ember-data/*` packages. Newer apps should use the same builders
from [`@warp-drive/utilities/rest`](/api/@warp-drive/utilities/rest/) instead.
:::

Request builders for **REST**ful APIs.

A request builder is a function that takes the few things that vary about a request, such as
the resource type, an id, or query params, and returns the request options object you pass to
`store.request()`: the `url`, `method`, and `headers`, plus the ***Warp*Drive**-specific fields
such as `op` that let the cache understand the request. The builders live in the
[`@ember-data/rest/request`](/api/@ember-data/rest/request/) entry point.

The output works with either `store.request()` or `requestManager.request()`. URLs are stable: the
same query produces the same URL every time, even if the order of keys in the query or values in an
array changes. URLs follow the most common REST format, camelCase pluralized resource types.
