---
description: Placeholder for the guide to relational fields such as `resource`, `collection`, `belongsTo`, and `hasMany` on a ResourceSchema; no content yet.
---

# Relational Fields

Relational Fields describe how resources are connected. They allow you to define belongs-to and has-many style relationships in a clear and reactive way.  
They are always defined inside a [ResourceSchema](./resource-schemas.md).

## Defining Relationships

There are two kinds of relational fields:

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'id', kind: '@id' },
    { name: 'name', kind: 'field' },

    // belongs-to
    { name: 'profile', kind: 'resource', type: 'profile' },

    // has-many
    { name: 'posts', kind: 'collection', type: 'post' }
  ]
});
```

* `resource` defines a single related record (similar to belongs-to).  
* `collection` defines multiple related records (similar to has-many).  

WarpDrive ensures that if the same record appears in multiple places, it is represented by the same instance in the cache.

## Options

Relational fields can include options that control how they behave:

```ts [schemas/pet.ts]
export const PetSchema = withDefaults({
  type: 'pet',
  fields: [
    { name: 'id', kind: '@id' },
    { name: 'name', kind: 'field' },
    {
      name: 'owner',
      kind: 'resource',
      type: 'user',
      options: {
        async: true,
        inverse: 'pets'
      }
    }
  ]
});
```

### `async`

If `async: true`, the related record may load separately from the parent. This is useful when the API provides links for relationships rather than embedding them.

If `async: false`, the related record is expected to be included with the parent.

### `inverse`

Defines the back-reference on the related schema. In the example above, `user.pets` is the inverse of `pet.owner`. This keeps relationships consistent in both directions.

### `polymorphic`

`polymorphic: true` allows a collection to hold different resource types. For example:

```ts [schemas/owner.ts]
export const OwnerSchema = withDefaults({
  type: 'owner',
  fields: [
    { name: 'id', kind: '@id' },
    {
      name: 'pets',
      kind: 'collection',
      options: { polymorphic: true }
    }
  ]
});
```

This allows `owner.pets` to contain dogs, cats, or any other resource type registered as a `pet`.

## Registering Schemas

Relationships work once all participating schemas are registered:

```ts [store/index.ts]
store.schema.registerResource(UserSchema);
store.schema.registerResource(PostSchema);
store.schema.registerResource(ProfileSchema);
```

With schemas registered, you can traverse relationships reactively:

```ts
const user = await store.request(findRecord('user', '1'));
console.log(user.profile.bio);
console.log(user.posts[0].title);
```

## Summary

Relational Fields give you:

* `resource` for belongs-to relationships  
* `collection` for has-many relationships  
* Options such as `async`, `inverse`, and `polymorphic` to fit your API  

They integrate with the cache so related records stay consistent and reactive across your app.  
For more on nested structures, see [Complex Fields](./complex-fields.md).

