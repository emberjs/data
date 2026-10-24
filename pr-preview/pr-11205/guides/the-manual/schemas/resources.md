---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/guides/the-manual/schemas/resources.md
description: >-
  Create a top-level ResourceSchema with `withDefaults`, choose `field`,
  `resource`, `collection`, or `schema-object` kinds, register it, and pick
  LegacyMode or PolarisMode.
---

# ResourceSchemas

ResourceSchemas define the top level resources in your data layer.\
They describe your application’s data structure in one place, including fields, relationships and embedded objects, without hidden magic.

A ResourceSchema is the backbone of how WarpDrive understands your data.

A ResourceSchema has a "mode" which instructs WarpDrive on how a ReactiveResource should behave.
There are currently two modes:

* [LegacyMode (recommended)](./legacy-mode.md)
* [PolarisMode (preview)](./polaris-mode.md)

## Why ResourceSchemas Matter

ResourceSchemas give you clarity by making every field and relationship explicit. They provide consistency because the schema drives the cache, transforms and UI bindings. They bring reactivity so changes anywhere in a resource flow through to your app automatically. They also work across any JavaScript environment including Ember, React or a Node process without a DOM.

## Creating a ResourceSchema

The easiest way to create a ResourceSchema is to use `withDefaults`. This sets up sensible defaults such as the primary key.

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'field' },
    { name: 'lastName', kind: 'field' },
    { name: 'email', kind: 'field' },
    { name: 'team', kind: 'resource', type: 'team' }
  ]
});
```

### Key Points

The `type` identifies the resource (the ResourceType).\
`fields` describes each piece of data:

* `field` for primitive data
* `resource` for a single related resource
* `collection` for multiple related resources
* `schema-object` for an embedded object schema

`withDefaults` automatically provides an identity field of `{ name: 'id', kind: '@id' }` unless you override it.

## Registering a ResourceSchema

Once defined, register your schema with the store so WarpDrive can use it at runtime.

```ts [store/index.ts]
store.schema.registerResource({
  type: 'user',
  identity: { kind: '@id', name: 'id' },
  fields: [
    { kind: 'field', name: 'firstName', sourceKey: 'first_name' },
    { kind: 'field', name: 'lastName', sourceKey: 'last_name' },
    { kind: 'field', name: 'lastSeen', sourceKey: 'last_seen', type: 'date-time' },
    {
      kind: 'resource',
      name: 'bestFriend',
      sourceKey: 'best-friend',
      options: { async: false, inverse: null }
    },
    {
      kind: 'collection',
      name: 'pets',
      options: { async: false, inverse: null, polymorphic: true }
    },
  ]
});
```

* `identity` → defines the primary key
* `sourceKey` → maps API field names to local names (`first_name` → `firstName`)
* `resource` and `collection` → relationships to other schemas (belongsTo / hasMany)
* `type` on a field → plugs in transforms for dates, URLs, decimals, etc.

***

After registering you can fetch or create data for that resource:

```ts
const user = await store.request(findRecord('user', '1'));
console.log(user.firstName);
```

## Common Field Kinds

| Kind           | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `field`        | Basic data (string, number, boolean)              |
| `resource`     | One related record (similar to a belongs-to)       |
| `collection`   | Multiple related records (similar to a has-many)   |
| `schema-object`| Embedded object schema with no top level identity  |

By defining your data with ResourceSchemas, you create a clear contract between your API, your cache and your UI. This makes your application more maintainable, predictable and ready for the future.
