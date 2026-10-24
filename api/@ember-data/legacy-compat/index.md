---
url: https://canary.warp-drive.io/api/@ember-data/legacy-compat.md
description: >-
  (Legacy) Shims such as `LegacyNetworkHandler`, `adapterFor` and
  `serializerFor` that keep Adapters and Serializers working with the
  `RequestManager`; now published as `@warp-drive/legacy/compat`.
---

&#x20;

:::warning Legacy package
`@ember-data/legacy-compat` is a legacy package. It bridges Models, Adapters, and Serializers to the `RequestManager` and cache; new code should skip it and start from [`@warp-drive/core`](/api/@warp-drive/core/) with schemas, Handlers, and request builders.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
:::

This package exists to help apps migrate incrementally from legacy EmberData patterns to modern WarpDrive.

It re-exports [`@warp-drive/legacy/compat`](/api/@warp-drive/legacy/compat/), whose documentation covers why it
exists, what it provides and when to use it.
