---
url: /pr-preview/pr-11154/guides/the-manual/schemas/traits.md
---
# Traits

Traits are reusable groups of fields that you can include in multiple ResourceSchemas.\
They help keep schemas consistent and reduce duplication.

A Trait is defined as a plain object with fields, and then registered so it can be reused anywhere.

## Creating a Trait

```ts [schemas/traits/timestamps.ts]
export const Timestamps = {
  name: 'timestamps',
  mode: 'polaris',
  fields: [
    { name: 'createdAt', kind: 'field', type: 'date' },
    { name: 'updatedAt', kind: 'field', type: 'date' }
  ],
};
```

## Registering a Trait

Register the Trait with the SchemaService using [`registerTrait`](https://canary.warp-drive.io/api/@warp-drive/core/reactive/classes/SchemaService#registertrait).

```ts [store/index.ts]
import { store } from './store';
import { Timestamps } from './schemas/traits/timestamps';

schema.registerTrait(Timestamps);
```

## Using a Trait in a ResourceSchema

Once registered, include the Trait name inside the `traits` array.

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'id', kind: '@id' },
    { name: 'name', kind: 'field' },
  ]
  traits: ['timestamps']
});
```

The `timestamps` Trait is now merged into the `user` ResourceSchema.

## Reuse Example

Traits can be shared across multiple schemas.

```ts [schemas/post.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const PostSchema = withDefaults({
  type: 'post',
  fields: [
    { name: 'id', kind: '@id' },
    { name: 'title', kind: 'field' }
  ],
  traits: ['timestamps']
});
```

Both `UserSchema` and `PostSchema` now include `createdAt` and `updatedAt` automatically.

By defining and registering Traits, you can reuse consistent sets of fields across your ResourceSchemas without duplicating code.
