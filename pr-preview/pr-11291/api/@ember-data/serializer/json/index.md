---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@ember-data/serializer/json.md
description: >-
  Legacy alias that re-exports `JSONSerializer` from
  `@warp-drive/legacy/serializer/json` so `@ember-data/serializer/json` imports
  keep working.
---

&#x20;

:::warning Legacy package
`@ember-data/serializer` is a legacy package. Serializers are no longer encouraged; new code should use [Handlers](/api/@warp-drive/core/request/types/Handler) with the `RequestManager` from [`@warp-drive/core`](/api/@warp-drive/core/) instead.
:::

Legacy alias of [@warp-drive/legacy/serializer/json](../../../@warp-drive/legacy/serializer/json/index.md).
This entry re-exports the JSON serializer from that module unchanged so existing
`@ember-data/serializer/json` imports keep working; new code should import
from `@warp-drive/legacy/serializer/json` directly.
