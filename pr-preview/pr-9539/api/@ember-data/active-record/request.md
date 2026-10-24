---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@ember-data/active-record/request.md
description: >-
  Legacy alias that re-exports the ActiveRecord-style request builders
  (`findRecord`, `query`, `createRecord`, `updateRecord`, `deleteRecord`) from
  `@warp-drive/utilities/active-record`.
---

&#x20;

:::warning Legacy package
`@ember-data/active-record` is a legacy package. New code should use [`@warp-drive/utilities/active-record`](/api/@warp-drive/utilities/active-record/) instead.
:::

Legacy alias of [@warp-drive/utilities/active-record](../../../@warp-drive/utilities/active-record/index.md).
This entry re-exports the request builders from that module unchanged so existing
`@ember-data/active-record/request` imports keep working; new code should import
from `@warp-drive/utilities/active-record` directly.
