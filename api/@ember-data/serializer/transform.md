---
url: https://canary.warp-drive.io/api/@ember-data/serializer/transform.md
description: >-
  Legacy alias that re-exports the base `Transform` and the boolean, string,
  number, and date attribute transforms from
  `@warp-drive/legacy/serializer/transform`.
---

&#x20;

:::warning Legacy package
`@ember-data/serializer` is a legacy package. Serializers are no longer encouraged; new code should use [Handlers](/api/@warp-drive/core/request/types/Handler) with the `RequestManager` from [`@warp-drive/core`](/api/@warp-drive/core/) instead.
:::

Legacy alias of [@warp-drive/legacy/serializer/transform](../../../@warp-drive/legacy/serializer/transform/index.md).
This entry re-exports the attribute transforms from that module unchanged so existing
`@ember-data/serializer/transform` imports keep working; new code should import
from `@warp-drive/legacy/serializer/transform` directly.
