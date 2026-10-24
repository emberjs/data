---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/guides/the-manual/schemas/object-schemas.md
description: >-
  Define an embedded ObjectSchema with a null identity, reference it from a
  resource via a `schema-object` field, and register it with `registerResource`
  so nested data is reactive.
---

# ObjectSchemas

An ObjectSchema lets you model nested or embedded data structures inside a ResourceSchema. This is ideal when a piece of data belongs to a resource but does not have its own identity (no `@id`) and should not be a top-level resource.

Using ObjectSchemas keeps your ResourceSchemas organized and reusable while maintaining full reactivity.

## Why ObjectSchemas Matter

An ObjectSchema gives you a way to express reusable, structured data shapes within a ResourceSchema. This approach keeps your data layer explicit and easy to read, avoids flattening nested structures and allows you to reuse the same embedded shape across multiple resources.

ObjectSchemas are a good fit for embedded address data, user preferences, configuration blocks, or translations where each entry has fields but no independent identity.

## Defining an ObjectSchema

```ts [schemas/address.ts]
export const AddressSchema = {
  type: 'address',
  identity: null, // no @id, embedded
  fields: [
    { name: 'street', kind: 'field' },
    { name: 'city', kind: 'field' },
    { name: 'zipCode', kind: 'field' }
  ]
};
```

Here `identity: null` marks this as an embedded schema with no independent identity. All fields are defined the same way as in a ResourceSchema. You can reuse this schema anywhere you need an address shape.

## Using an ObjectSchema Inside a ResourceSchema

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';
import { AddressSchema } from './address';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'id', kind: '@id' },
    { name: 'name', kind: 'field' },
    { name: 'address', kind: 'schema-object', type: 'address' }
  ]
});
```

`schema-object` tells WarpDrive to embed the ObjectSchema here. The `type` on the field references the schema defined above.

## Registering an ObjectSchema

ObjectSchemas are plain JavaScript objects. To make them available at runtime you register them just like a ResourceSchema:

```ts [store/index.ts]
import { store } from './store';
import { UserSchema } from './schemas/user';
import { AddressSchema } from './schemas/address';

store.schema.registerResource(AddressSchema);
store.schema.registerResource(UserSchema);
```

Once registered, changes to embedded objects are fully reactive and flow through to your UI just like top-level ResourceSchemas.

## Why ObjectSchemas Are Powerful

ObjectSchemas allow you to model realistic nested shapes without creating unnecessary top-level resources. Embedded fields remain reactive, updates flow automatically to the UI, and the same embedded shape can be reused across multiple ResourceSchemas.

If later the data grows into a standalone entity, you can easily migrate from an ObjectSchema to a ResourceSchema with minimal changes.

By using ObjectSchemas, you can model rich nested structures in your application data layer without sacrificing clarity or reactivity.
