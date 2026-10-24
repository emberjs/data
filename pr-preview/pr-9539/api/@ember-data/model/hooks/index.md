---
url: https://canary.warp-drive.io/pr-preview/pr-9539/api/@ember-data/model/hooks.md
description: >-
  Legacy alias that re-exports the `Model` lifecycle hooks `instantiateRecord`,
  `teardownRecord`, `modelFor`, and `buildSchema` from
  `@warp-drive/legacy/model`.
---

&#x20;

:::warning Legacy package
`@ember-data/model` is a legacy package. Model classes are no longer encouraged; new code should define schemas with [`@warp-drive/core`](/api/@warp-drive/core/). Apps that still need Models should install them through [`@warp-drive/legacy`](/api/@warp-drive/legacy/) rather than this package.
:::

Legacy alias of [@warp-drive/legacy/model](../../../@warp-drive/legacy/model/index.md).
This entry re-exports the model lifecycle hooks from that module unchanged so existing
`@ember-data/model/hooks` imports keep working; new code should import
from `@warp-drive/legacy/model` directly.
