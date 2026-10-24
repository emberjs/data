---
url: https://canary.warp-drive.io/api/@ember-data/serializer/rest.md
description: >-
  Legacy alias that re-exports `RESTSerializer` and `EmbeddedRecordsMixin` from
  `@warp-drive/legacy/serializer/rest` so `@ember-data/serializer/rest` imports
  keep working.
---

&#x20;

:::warning Legacy package
`@ember-data/serializer` is a legacy package. Serializers are no longer encouraged; new code should use [Handlers](/api/@warp-drive/core/request/types/Handler) with the `RequestManager` from [`@warp-drive/core`](/api/@warp-drive/core/) instead.
:::

Legacy alias of [@warp-drive/legacy/serializer/rest](../../../@warp-drive/legacy/serializer/rest/index.md).
This entry re-exports the REST serializer from that module unchanged so existing
`@ember-data/serializer/rest` imports keep working; new code should import
from `@warp-drive/legacy/serializer/rest` directly.
