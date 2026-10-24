---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@ember-data/adapter/error.md
description: >-
  Legacy alias that re-exports `AdapterError` and its subclasses (invalid,
  timeout, abort, 401, 403, 404, 409, 5xx) from
  `@warp-drive/legacy/adapter/error`.
---

&#x20;

:::warning Legacy package
`@ember-data/adapter` is a legacy package. Adapters are no longer encouraged; new code should use [Handlers](/api/@warp-drive/core/request/types/Handler) with the `RequestManager` from [`@warp-drive/core`](/api/@warp-drive/core/) instead.
:::

Legacy alias of [@warp-drive/legacy/adapter/error](../../../@warp-drive/legacy/adapter/error/index.md).
This entry re-exports the adapter error classes from that module unchanged so existing
`@ember-data/adapter/error` imports keep working; new code should import
from `@warp-drive/legacy/adapter/error` directly.
