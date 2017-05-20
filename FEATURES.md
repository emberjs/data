## About Features

Please read the [Feature Flag Guide](https://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

To add a new feature flag or change an existing one, you can add an
entry in `config/features.json`.

**Ember Data features flags must begin with `ds-`, such as
`ds-new-coalescing`.**

## Feature Flags

- `ds-improved-ajax` [#3099](https://github.com/emberjs/data/pull/3099)

  This feature allows to customize how a request is formed by overwriting
  `methodForRequest`, `urlForRequest`, `headersForRequest` and `bodyForRequest`
  in the `DS.RESTAdapter`.

- `ds-pushpayload-return` [#4110](https://github.com/emberjs/data/pull/4110)

  Enables `pushPayload` to return the model(s) that are created or
  updated via the internal `store.push`.

- `ds-extended-errors` [#3586](https://github.com/emberjs/data/pull/3586) [#4287](https://github.com/emberjs/data/pull/4287)

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

- `ds-payload-type-hooks` [#4318](https://github.com/emberjs/data/pull/4318)

  Adds two new hooks `modelNameFromPayloadType` and `payloadTypeFromModelName`
  hooks to the serializers. They are used to map a custom type in the payload
  to the Ember-Data model name and vice versa.

  It also deprecates `modelNameFromPayloadKey` and `payloadKeyFromModelName`
  for the JSONSerializer and JSONAPISerializer: those payloads don't have
  _keys_ which represent a model name. Only the keys in the payload for a
  RESTSerializer represent model names, so the `payloadKeyFromModelName` and
  `modelNameFromPayloadKey` are available in that serializer.

  ```js
  // rest response
  {
    "blog/post": {
      "id": 1,
      "user": 1,
      "userType": "api::v1::administrator"
    }
  }

  // RESTSerializer invokes the following hooks
  restSerializer.modelNameFromPayloadKey("blog/post");
  restSerializer.modelNameFromPayloadType("api::v1::administrator");
  ```

  ```js
  // json-api response
  {
    "data": {
      "id": 1,
      "type": "api::v1::administrator",
      "relationships": {
        "supervisor": {
          "data": {
            "id": 1,
            "type": "api::v1::super-user"
          }
        }
      }
    }
  }

  // JSONAPISerializer invokes the following hooks
  jsonApiSerializer.modelNameFromPayloadType("api::v1::administrator");
  jsonApiSerializer.modelNameFromPayloadType("api::v1::super-user");
  ```

- `ds-overhaul-references` [#4398](https://github.com/emberjs/data/pull/4398)

  This tackles some inconsistencies within `push()` on references. It should
  only be used to push a JSON-API payload. The following use cases are
  addressed and deprecated:

  - `BelongsToReference#push()` accepts a `DS.Model`
  - `HasManyReference#push()` accepts a plain array
  - `HasManyReference#push()` accepts a pseudo-JSON-API format:

      ```js
      {
        data: [
          { data: { type: 'model', id: 1 } }
        ]
      }
      ```

- `ds-check-should-serialize-relationships` [#4279](https://github.com/emberjs/data/pull/4279)

  Adds public method for `shouldSerializeHasMany`, used to determine if a
  `hasMany` relationship can be serialized.

- `ds-rollback-attribute` [#4246](https://github.com/emberjs/data/pull/4246)

  Adds a `rollbackAttribute` method to models. Similar to `rollbackAttributes`,
  but for only a single attribute.

  ```js
    // { firstName: 'Tom', lastName: 'Dale' }
    let tom = store.peekRecord('person', 1);

    tom.setProperties({
      firstName: 'Yehuda',
      lastName: 'Katz'
    });

    tom.rollbackAttribute('firstName') // { firstName: 'Tom', lastName: 'Katz' }
    tom.get('hasDirtyAttributes')   // true

    tom.rollbackAttribute('lastName')  // { firstName: 'Tom', lastName: 'Dale' }
    tom.get('hasDirtyAttributes')   // false
  ```

- `ds-serialize-id` [#4620](https://github.com/emberjs/data/pull/4620)

  Adds a `serializeId` method to JSONSerializer.

  ```js
   // app/serializers/application.js
   import DS from 'ember-data';

   export default DS.JSONSerializer.extend({
     serializeId(snapshot, json, primaryKey) {
       var id = snapshot.id;
       json[primaryKey] = parseInt(id, 10);
     }
   });
  ```
- `ds-deprecate-store-serialize` [#4654](https://github.com/emberjs/data/pull/4654)

  Adds a deprecation warning when using Store#serialize(record) method.
  You can use record.serialize() instead.
