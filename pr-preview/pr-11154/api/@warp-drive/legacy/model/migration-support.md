---
url: /pr-preview/pr-11154/api/@warp-drive/legacy/model/migration-support.md
---

&#x20;

This module provides support for migrating away from @warp-drive/legacy/model
to ReactiveResource from @warp-drive/core/reactive.

It includes:

* A `withDefaults` function to assist in creating a schema in LegacyMode
* A `registerDerivations` function to register the derivations necessary to support LegacyMode
* A `DelegatingSchemaService` that can be used to provide a schema service that works with both
  @warp-drive/legacy/model and @warp-drive/core/reactive simultaneously for migration purposes.
* A `WithLegacy` type util that can be used to create a type that includes the legacy
  properties and methods of a record.

Using LegacyMode features on a ReactiveResource *requires* the use of these derivations and schema
additions. LegacyMode is not intended to be a long-term solution, but rather a stepping stone
to assist in more rapidly adopting modern WarpDrive features.

## Classes

* [DelegatingSchemaService](classes/DelegatingSchemaService.md)

## Functions

* [registerDerivations](functions/registerDerivations.md)
* [withDefaults](functions/withDefaults.md)
* [withRestoredDeprecatedModelRequestBehaviors](functions/withRestoredDeprecatedModelRequestBehaviors.md)

## Types

* [WithLegacy](types/WithLegacy.md)
* [WithLegacyDerivations](types/WithLegacyDerivations.md)
