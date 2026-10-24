---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/guides/the-manual/schemas/complex-fields.md
description: >-
  Embed nested objects and lists inside a resource with `schema-object` and
  `schema-array` fields backed by an identity-less ObjectSchema, keeping every
  nested value reactive.
---

# Complex Fields

Complex Fields let you model nested or repeated structures inside a resource. They are useful when a resource contains structured data that is not itself a top-level resource.\
They always appear inside a [ResourceSchema](./resources/index.md).

## Schema Objects

A Schema Object represents a single embedded structure with no identity of its own.\
See also [ObjectSchemas](./object-schemas.md) for more details.

```ts [schemas/address.ts]
export const AddressSchema = {
  type: 'address',
  identity: null,
  fields: [
    { name: 'street', kind: 'field' },
    { name: 'city', kind: 'field' },
    { name: 'zipCode', kind: 'field' }
  ]
};
```

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

* `identity: null` marks the schema as embedded.
* `schema-object` fields embed it inside another resource.
* Embedded fields are reactive just like top-level fields.

## Schema Arrays

A Schema Array represents a list of embedded objects.

```ts [schemas/translation.ts]
export const TranslationSchema = {
  type: 'translation',
  identity: null,
  fields: [
    { name: 'locale', kind: 'field' },
    { name: 'text', kind: 'field' }
  ]
};
```

```ts [schemas/post.ts]
import { withDefaults } from '@warp-drive/core/reactive';
import { TranslationSchema } from './translation';

export const PostSchema = withDefaults({
  type: 'post',
  fields: [
    { name: 'id', kind: '@id' },
    { name: 'title', kind: 'field' },
    { name: 'translations', kind: 'schema-array', type: 'translation' }
  ]
});
```

This makes `post.translations` a reactive array of translation objects.

## Why Use Complex Fields

Complex Fields keep nested data structured without making it a top-level resource. They can be reused across schemas and work well for:

* Addresses or contact info.
* Translations and localized content.
* Structured metadata.
* Tags or other small repeated objects.

All nested fields remain reactive, so UI updates flow naturally.

## Summary

Complex Fields come in two forms:

* `schema-object` for a single embedded object.
* `schema-array` for a list of embedded objects.

They are ideal for representing nested data like addresses, translations, or metadata while keeping everything reactive and consistent.\
For defining the top-level shape of your data, see [ResourceSchemas](./resources/index.md).
