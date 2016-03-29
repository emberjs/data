## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

To add a new feature flag or change an existing one, you can add an
entry in `config/features.json`.

**Ember Data features flags must begin with `ds-`, such as
`ds-new-coalescing`.**

## Feature Flags

- `ds-boolean-transform-allow-null`

  Allow `null`/`undefined` values for `boolean` attributes via `DS.attr('boolean', { allowNull: true })`

  Note that this feature only works when `ds-transform-pass-options` is enabled too.

- `ds-finder-include`

  Allows an `include` query parameter to be specified with using
  `store.findRecord()` and `store.findAll()` as described in [RFC
  99](https://github.com/emberjs/rfcs/pull/99)

- `ds-improved-ajax`

  This feature allows to customize how a request is formed by overwriting
  `methodForRequest`, `urlForRequest`, `headersForRequest` and `bodyForRequest`
  in the `DS.RESTAdapter`.

- `ds-references`

  Adds references as described in [RFC 57](https://github.com/emberjs/rfcs/pull/57)

- `ds-transform-pass-options`

  Pass options specified for a `DS.attr` to the `DS.Tranform`'s `serialize` and
  `deserialize` methods (described in [RFC 1](https://github.com/emberjs/rfcs/pull/1))

- `ds-pushpayload-return`

  Enables `pushPayload` to return the model(s) that are created or
  updated via the internal `store.push`. [PR 4110](https://github.com/emberjs/data/pull/4110)

- `ds-serialize-ids-and-types`

  Enables a new `ids-and-type` strategy (in addition to the already existing `ids` and `records`) for
  serializing has many relationships using the `DS.EmbeddedRecordsMixin` that  will include both
  `id` and `type` of each model as an object.

  For instance, if a use has many pets, which is a polymorphic relationship, the generated payload would be:

  ```js
  {
    "user": {
      "id": "1"
      "name": "Bertin Osborne",
      "pets": [
        { "id": "1", "type": "Cat" },
        { "id": "2", "type": "Parrot"}
      ]
    }
  }
  ```

  This is particularly useful for polymorphic relationships not backed by STI when just including the id
  of the records is not enough.

- `ds-extended-errors`

  Enables `extend` method on errors. It means you can extend from `DS.AdapterError`.

  ```js
    const MyCustomError = DS.AdapterError.extend({ message: "My custom error." });
  ```

  It will also add a few new errors to rest adapter based on http status.

  * [401] `DS.UnauthorizedError`
  * [403] `DS.ForbiddenError`
  * [404] `DS.NotFoundError`
  * [409] `DS.ConflictError`
  * [500] `DS.ServerError`
