---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@ember-data/store/types.md
description: >-
  Legacy alias that re-exports the store public types (schema service, finder
  options, model schema, and more) from `@warp-drive/core/types`.
---

&#x20;

:::warning Legacy package
`@ember-data/store` is a legacy package. New code should use [`@warp-drive/core`](/api/@warp-drive/core/) instead.
:::

Legacy alias of [@warp-drive/core/types](../../../@warp-drive/core/types/index.md).
This entry re-exports the store's public types from that module unchanged so existing
`@ember-data/store/types` imports keep working; new code should import
from `@warp-drive/core/types` directly.
