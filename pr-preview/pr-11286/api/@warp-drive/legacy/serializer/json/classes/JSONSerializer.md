---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/serializer/json/classes/JSONSerializer.md
---

&#x20;

# &#x20;JSONSerializer

Defined in: [warp-drive-packages/legacy/src/serializer/json.ts:105](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/serializer/json.ts#L105)

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../../../core/classes/RequestManager.md)
:::

In WarpDrive a Serializer is used to serialize and deserialize
records when they are transferred in and out of an external source.
This process involves normalizing property names, transforming
attribute values and serializing relationships.

By default, WarpDrive uses and recommends the `JSONAPISerializer`.

`JSONSerializer` is useful for simpler or legacy backends that may
not support the http://jsonapi.org/ spec.

For example, given the following `User` model and JSON payload:

```js [app/models/user.js]
import Model, { attr, belongsTo, hasMany } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @hasMany('user') friends;
  @belongsTo('location') house;

  @attr('string') name;
}
```

```js
{
  id: 1,
  name: 'Sebastian',
  friends: [3, 4],
  links: {
    house: '/houses/lefkada'
  }
}
```

`JSONSerializer` will normalize the JSON payload to the {json:api} format that the
JSONAPICache uses to cache data in the Store.

You can customize how JSONSerializer processes its payload by passing options in
the `attrs` hash or by subclassing the `JSONSerializer` and overriding hooks:

* To customize how a single record is normalized, use the `normalize` hook.
* To customize how `JSONSerializer` normalizes the whole server response, use the
  `normalizeResponse` hook.
* To customize how `JSONSerializer` normalizes a specific response from the server,
  use one of the many specific `normalizeResponse` hooks.
* To customize how `JSONSerializer` normalizes your id, attributes or relationships,
  use the `extractId`, `extractAttributes` and `extractRelationships` hooks.

The `JSONSerializer` normalization process follows these steps:

1. `normalizeResponse`
   * entry method to the serializer.
2. `normalizeCreateRecordResponse`
   * a `normalizeResponse` for a specific operation is called.
3. `normalizeSingleResponse`|`normalizeArrayResponse`
   * for methods like `createRecord` we expect a single record back, while for methods like `findAll` we expect multiple records back.
4. `normalize`
   * `normalizeArrayResponse` iterates and calls `normalize` for each of its records while `normalizeSingle`
     calls it once. This is the method you most likely want to subclass.
5. `extractId` | `extractAttributes` | `extractRelationships`
   * `normalize` delegates to these methods to
     turn the record payload into the JSON API format.

JSONSerializer
