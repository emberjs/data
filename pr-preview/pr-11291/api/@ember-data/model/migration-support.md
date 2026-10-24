---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@ember-data/model/migration-support.md
description: >-
  Legacy helpers (`withDefaults`, `registerDerivations`,
  `DelegatingSchemaService`, `WithLegacy`) for migrating from
  `@ember-data/model` to schema-driven records in LegacyMode.
---

&#x20;

:::warning Legacy package
`@ember-data/model` is a legacy package. Model classes are no longer encouraged; new code should define schemas with [`@warp-drive/core`](/api/@warp-drive/core/). Apps that still need Models should install them through [`@warp-drive/legacy`](/api/@warp-drive/legacy/) rather than this package.
:::

This module provides support for migrating away from @ember-data/model
to @warp-drive/schema-record.

It includes:

* A `withDefaults` function to assist in creating a schema in LegacyMode
* A `registerDerivations` function to register the derivations necessary to support LegacyMode
* A `DelegatingSchemaService` that can be used to provide a schema service that works with both
  @ember-data/model and @warp-drive/schema-record simultaneously for migration purposes.
* A `WithLegacy` type util that can be used to create a type that includes the legacy
  properties and methods of a record.

Using LegacyMode features on a ReactiveResource *requires* the use of these derivations and schema
additions. LegacyMode is not intended to be a long-term solution, but rather a stepping stone
to assist in more rapidly adopting modern WarpDrive features.
