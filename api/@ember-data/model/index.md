---
url: https://canary.warp-drive.io/api/@ember-data/model.md
description: >-
  (Legacy) `Model` class and its `attr`, `belongsTo` and `hasMany` decorators,
  re-exported from `@warp-drive/legacy/model`; new apps should define schemas
  for `@warp-drive/core` instead.
---

&#x20;

:::warning Legacy package
`@ember-data/model` is a legacy package. Model classes are no longer encouraged; new code should define schemas with [`@warp-drive/core`](/api/@warp-drive/core/). Apps that still need Models should install them through [`@warp-drive/legacy`](/api/@warp-drive/legacy/) rather than this package.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
:::

This package provides runtime classes for use as a source of ResourceSchema and as a ReactiveResource for older "legacy" EmberData/WarpDrive configurations.

It re-exports [`@warp-drive/legacy/model`](/api/@warp-drive/legacy/model/), whose documentation covers
defining Models, why they are legacy and what replaces them.
