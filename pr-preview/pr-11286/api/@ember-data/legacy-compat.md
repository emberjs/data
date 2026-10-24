---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@ember-data/legacy-compat.md
---

:::warning ⚠️ Legacy Compatibility Package
This package provides **compatibility shims** to bridge legacy EmberData patterns (Models, Adapters, Serializers) with modern WarpDrive infrastructure (RequestManager, Handlers, Cache).

**For new projects:** Do not use this package. Start with [@warp-drive/core](../../@warp-drive/core/index.md) and modern patterns (schemas, Handlers, request builders).
:::

This package exists to help apps migrate incrementally from legacy EmberData patterns to modern WarpDrive.

**Why it exists:** When migrating from legacy EmberData to modern WarpDrive, you may need to:

* Use `@ember-data/model` classes with the new `RequestManager`
* Keep Adapters/Serializers working while adopting new patterns incrementally
* Maintain backward compatibility during a gradual migration

**What it provides:**

* `LegacyNetworkHandler` - Allows Adapters and Serializers to work with RequestManager
* Compatibility layers that translate between legacy APIs and modern WarpDrive internals
* Hooks to integrate Model classes with the modern Store

**When to use this:** Only use this package during a migration from legacy EmberData to modern WarpDrive. It allows you to adopt modern patterns incrementally while keeping your existing code working.

For guidance on incremental migration strategies, see the [Migration Guide](/upgrading/v5/) and [Two Store Migration Strategy](/upgrading/v5/two-store-migration).
