/**
  ## Overview

  :::caution
    ⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
    If starting a new app or thinking of implementing a new serializer, consider writing a
    {@link Handler} instead to be used with the {@link RequestManager}.

  In order to properly manage and present your data, EmberData
  needs to understand the structure of data it receives.

  `Serializers` convert data between the server's API format and
  the format EmberData understands.

  Data received from an API response is **normalized** into
  [JSON:API](https://jsonapi.org/) (the format used internally
  by EmberData), while data sent to an API is **serialized**
  into the format the API expects.

  ### Implementing a Serializer

  There are only two required serializer methods, one for
  normalizing data from the server API format into JSON:API, and
  another for serializing records via `Snapshots` into the expected
  server API format.

  To implement a serializer, export a class that conforms to the structure
  described by {@link MinimumSerializerInterface}
  from the `app/serializers/` directory. An example is below.

  ```ts
  import EmberObject from '@ember/object';

  export default class ApplicationSerializer extends EmberObject {
    normalizeResponse(store, schema, rawPayload) {
      return rawPayload;
    }

    serialize(snapshot, options) {
      const serializedResource = {
        id: snapshot.id,
        type: snapshot.modelName,
        attributes: snapshot.attributes()
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
  store.serializerFor('author');

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

  @module
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RequestManager } from '@warp-drive/core';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Handler } from '@warp-drive/core/request';

export { Serializer as default } from '@warp-drive/legacy/serializer';
