---
url: https://canary.warp-drive.io/api/@ember-data/serializer.md
description: >-
  (Legacy) JSON, REST and JSON:API implementations of the Serializer interface,
  re-exported from `@warp-drive/legacy/serializer`; new apps should normalize
  data in request handlers instead.
---

&#x20;

:::warning Legacy package
`@ember-data/serializer` is a legacy package. Serializers are no longer encouraged; new code should use [Handlers](/api/@warp-drive/core/request/types/Handler) with the `RequestManager` from [`@warp-drive/core`](/api/@warp-drive/core/) instead.

For an app still on these packages, see [Legacy Package Setup](/guides/configuration/legacy-package-setup/).
:::

This package provides JSON, REST and JSON:API Implementations of the legacy Serializer Interface.

It re-exports [`@warp-drive/legacy/serializer`](/api/@warp-drive/legacy/serializer/), whose documentation covers
setting up and implementing Serializers, why they are legacy and what replaces them.
