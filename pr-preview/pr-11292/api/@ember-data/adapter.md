---
url: https://canary.warp-drive.io/pr-preview/pr-11292/api/@ember-data/adapter.md
---

:::warning ⚠️ Legacy Package
**Adapters are a LEGACY feature** that is no longer encouraged for new applications.

**For new projects:** Use [Handlers](/api/@warp-drive/core/request/types/Handler) with the [RequestManager](../../@warp-drive/core/classes/RequestManager.md) instead.
:::

This package provides REST and [{json:api}](https://jsonapi.org) Implementations of the legacy Adapter Interface when using the older packages.

**Why it's legacy:** The Adapter pattern was designed for class-based, inheritance-heavy architectures where each resource type could have its own data fetching logic. This approach:

* Creates tight coupling between your data layer and API implementation
* Makes it difficult to compose request logic or share behavior across resource types
* Lacks type safety and modern async patterns
* Requires runtime resolution and increases bundle size

**Modern alternative:** Use Handlers with the RequestManager. Handlers are composable, framework-agnostic functions that process requests through a pipeline. They support:

* Request builders for type-safe API calls
* Middleware-style composition (Gate, Fetch, CacheHandler)
* Better code splitting and tree shaking
* Framework-agnostic patterns that work in React, Vue, Svelte, and Ember

**When you still need this:** Only use Adapters if you're maintaining an existing Ember application that hasn't migrated to modern WarpDrive patterns.

For an alternative modern pattern to Adapters, see the [Request Handlers Guide](/guides/the-manual/requests/handlers).
