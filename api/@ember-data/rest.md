---
url: https://canary.warp-drive.io/api/@ember-data/rest.md
description: >-
  (Legacy) REST request builders such as `findRecord`, `query` and
  `createRecord` that produce camelCase, pluralized URLs; new apps should import
  them from `@warp-drive/utilities/rest` instead.
---

&#x20;

:::warning Legacy package
`@ember-data/rest` is a legacy package. New code should use [`@warp-drive/utilities/rest`](/api/@warp-drive/utilities/rest/) instead.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
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
