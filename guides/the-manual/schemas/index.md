---
title: Overview
order: 0
categoryOrder: 3
---

# Schemas

Schemas are how ***Warp*Drive** understands the structure of your data, powering features like caching, relational data, and reactivity.

Schemas are also how [ReactiveResource](/api/@warp-drive/core/reactive/interfaces/ReactiveResource) knows to transform data from its raw serialized form in the cache into richer forms for use by your app.

<br>
<img class="dark-only" src="../../images/building-blocks-dark.png" alt="abstractly: stacks of cubes together creating a harmonious structure amidst chaos of crashing waves" width="100%">
<img class="light-only" src="../../images/building-blocks-light.png" alt="abstractly: stacks of cubes together creating a harmonious structure amidst chaos of crashing waves" width="100%">

## ResourceSchema

[ResourceSchemas](/api/@warp-drive/core/types/schema/fields/type-aliases/ResourceSchema) define the structure of the data for a specific `ResourceType`, for instance `'user'`.

Take for instance the following resource data for a user.

```ts
{
  type: 'user',
  id: '1',
  attributes: {
    'first-name': 'Chris',
    'last-name': 'Thoburn',
    'last-seen': 1757235977516
  },
  relationships: {
    'best-friend': { data: { type: 'user', id: '2' } },
    pets: { data: [{ type: 'dog', id: '1' }] }
  }
}
```

The above resource is using the [{json:api} format](https://jsonapi.org/format/#document-resource-objects) which matches the format for resources expected by the [JSONAPICache](/api/@warp-drive/json-api/) we provided earlier to the store created.

:::tip 💡 TIP
Dasherized keys is just a preference some APIs have, the JSONAPICache doesn't care what
format your keys are in, so long as your schema matches up to them.
:::

Above, we collectively call the keys of attributes and relationships "fields".

While this format is great for serializability, for expressing relational data, for handling polymorphic concerns ... and a lot more ... its both too verbose and not particularly useful
for our app.

Instead, we'd probably want to work with something that looked a bit more like this, with our fields flattened together, our keys in camelCase for easier access in JS, our relationships linked to the actual related records, and our `lastSeen` timestamp converted into a date for easier date math later:

```ts
interface User {
  id: string;
  firstName: string;
  lastName: string;
  lastSeen: ImmutableDateTime;
  bestFriend: User;
  pets: Pet[];
}
```

This is where our schema helps us out. Our schema helps the cache to know how to treat each field in the resource's data.

Let's build a schema to do this!

```ts
store.schema.registerResource({
  type: 'user',
  identity: { kind: '@id', name: 'id' },
  fields: [
    { kind: 'field', name: 'firstName', sourceKey: 'first-name' },
    { kind: 'field', name: 'lastName', sourceKey: 'last-name' },
    { kind: 'field', name: 'lastSeen', sourceKey: 'last-seen', type: 'date-time' },
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

Something you'll maybe note right away: schemas are JSON, which ensures a high degree of [flexibility](https://runspired.com/2025/05/25/in-defense-of-machine-formats.html) when creating or loading them.

***Warp*Drive** offers several categories of schema:

- ResourceSchema
- ObjectSchema
- Traits
