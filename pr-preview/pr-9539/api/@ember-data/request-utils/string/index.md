---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@ember-data/request-utils/string.md
description: >-
  Re-exports LRU-cached string inflection and case helpers (`pluralize`,
  `singularize`, `camelize`, `dasherize`, and others) from
  `@warp-drive/utilities/string`.
---

&#x20;

:::warning Legacy package
`@ember-data/request-utils` is a legacy package. New code should use [`@warp-drive/utilities`](/api/@warp-drive/utilities/) instead.
:::

String utilties for transforming and inflecting strings useful for
when the format provided by the server is not the format you want to use
in your application.

Each transformation function stores its results in an LRUCache to avoid
recomputing the same value multiple times. The cache size can be set
using the `setMaxLRUCacheSize` function. The default size is 10,000.
