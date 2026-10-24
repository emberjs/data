---
url: https://canary.warp-drive.io/api/@ember-data/adapter.md
description: >-
  (Legacy) REST and JSON:API implementations of the Adapter interface,
  re-exported from `@warp-drive/legacy/adapter`; new apps should write request
  handlers for the `RequestManager` instead.
---

&#x20;

:::warning Legacy package
`@ember-data/adapter` is a legacy package. Adapters are no longer encouraged; new code should use [Handlers](/api/@warp-drive/core/request/types/Handler) with the `RequestManager` from [`@warp-drive/core`](/api/@warp-drive/core/) instead.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
:::

This package provides REST and [{json:api}](https://jsonapi.org) Implementations of the legacy Adapter Interface when using the older packages.

It re-exports [`@warp-drive/legacy/adapter`](/api/@warp-drive/legacy/adapter/), whose documentation covers
implementing Adapters, why they are legacy and what replaces them.
