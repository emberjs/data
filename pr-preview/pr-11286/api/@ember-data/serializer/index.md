---
url: https://canary.warp-drive.io/pr-preview/pr-11286/api/@ember-data/serializer.md
---

:::warning ⚠️ Legacy Package
**Serializers are a LEGACY feature** that is no longer encouraged for new applications.

**For new projects:** Use [Handlers](/api/@warp-drive/core/request/types/Handler) with the [RequestManager](../../@warp-drive/core/classes/RequestManager.md) instead.
:::

This package provides JSON, REST and JSON:API Implementations of the legacy Serializer Interface.

**Why it's legacy:** The Serializer pattern was designed to transform data between your API format and the format expected by Models. This approach:

* Creates tight coupling between API payloads and your data layer
* Makes it difficult to handle multiple API response formats in the same app
* Requires verbose normalization/serialization code for each resource type
* Lacks type safety and compile-time validation
* Increases runtime overhead with class instantiation and method dispatch

**Modern alternative:** Use Handlers with the RequestManager. Modern WarpDrive:

* Uses transformation utilities in Handlers for data normalization
* Leverages cache implementations (like `JSONAPICache`) that understand your API format natively
* Provides better tree shaking since transformations are functions, not classes
* Works with schemas for type-safe data access without runtime parsing

**When you still need this:** Only use Serializers if you're maintaining an existing Ember application that uses `@ember-data/model` and Adapters.

For an alternative modern pattern to Serializers, see the [Request Handlers Guide](/guides/the-manual/requests/handlers).

## Legacy Serializers

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new serializer, consider writing a
[Handler](/api/@warp-drive/core/request/types/Handler) instead to be used with the [RequestManager](../../@warp-drive/core/classes/RequestManager.md).
:::

In order to properly manage and present your data, EmberData
needs to understand the structure of data it receives.

`Serializers` convert data between the server's API format and
the format EmberData understands.

Data received from an API response is **normalized** into
[{json:api}](https://jsonapi.org/) (the format used internally
by EmberData), while data sent to an API is **serialized**
into the format the API expects.

### Setup

If you use the `ember-data` package, no setup is needed. Otherwise, legacy serializers require the
`LegacyNetworkHandler` from [@ember-data/legacy-compat](../legacy-compat/index.md):

```sh
pnpm add @ember-data/legacy-compat
```

```ts
import Store, { CacheHandler } from '@ember-data/store';
import RequestManager from '@ember-data/request';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';

export default class extends Store {
  requestManager = new RequestManager()
    .use([LegacyNetworkHandler])
    .useCache(CacheHandler);
}
```

### Implementing a Serializer

There are only two required serializer methods, one for
normalizing data from the server API format into JSON:API, and
another for serializing records via `Snapshots` into the expected
server API format.

To implement a serializer, export a class that conforms to the structure
described by [MinimumSerializerInterface](/api/@warp-drive/legacy/compat/types/MinimumSerializerInterface)
from the `app/serializers/` directory. An example is below.

```ts
import EmberObject from "@ember/object";

export default class ApplicationSerializer extends EmberObject {
  normalizeResponse(store, schema, rawPayload) {
    return rawPayload;
  }

  serialize(snapshot, options) {
    const serializedResource = {
      id: snapshot.id,
      type: snapshot.modelName,
      attributes: snapshot.attributes(),
    };

    return serializedResource;
  }
}
```

### Serializer Resolution

`store.serializerFor(name)` will lookup serializers defined in
`app/serializers/` and return an instance. If no serializer is found, an
error will be thrown.

`serializerFor` first attempts to find a serializer with an exact match on `name`,
then falls back to checking for the presence of a serializer named `application`.

```ts
store.serializerFor("author");

// lookup paths (in order) =>
//   app/serializers/author.js
//   app/serializers/application.js
```

Most requests in EmberData are made with respect to a particular `type` (or `modelName`)
(e.g., "get me the full collection of **books**" or "get me the **employee** whose id is 37"). We
refer to this as the **primary** resource `type`.

Typically `serializerFor` will be used to find a serializer with a name matching that of the primary
resource `type` for the request, falling back to the `application` serializer for those types that
do not have a defined serializer. This is often described as a `per-model` or `per-type` strategy
for defining serializers. However, because APIs rarely format payloads per-type but rather
per-API-version, this may not be a desired strategy.

It is recommended that applications define only a single `application` adapter and serializer
where possible.

If you have multiple API formats and the per-type strategy is not viable, one strategy is to
write an `application` adapter and serializer that make use of `options` to specify the desired
format when making a request.

### Using a Serializer

Any serializer in `app/serializers/` can be looked up by `name` using `store.serializerFor(name)`.

### Default Serializers

For applications whose APIs are *very close to* or *exactly* the **REST** format or **JSON:API**
format the `@ember-data/serializer` package contains implementations these applications can
extend. It also contains a simple `JSONSerializer` for serializing to/from very basic JSON objects.

Many applications will find writing their own serializer to be more performant and less
complex than extending these classes even when their API format is very close to that expected
by these serializers.

It is recommended that apps write their own serializer to best suit the needs of their API and
application.
