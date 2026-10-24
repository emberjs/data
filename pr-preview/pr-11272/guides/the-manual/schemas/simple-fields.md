---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/guides/the-manual/schemas/simple-fields.md
description: >-
  Declare primitive string, number, boolean, or date attributes on a
  ResourceSchema or ObjectSchema as `field` kinds and attach a `type` to route
  them through a Transformation.
---

# SimpleFields

SimpleFields represent primitive values on a ResourceSchema or ObjectSchema. They are the most common type of field and map directly to the values your API sends and receives.

## What SimpleFields Are

A SimpleField stores data like strings, numbers, booleans, dates or any other primitive type. You define it with `kind: 'field'` in your schema. WarpDrive automatically makes these values reactive and keeps them in sync with the cache.

## Defining SimpleFields

```ts [schemas/user.ts]
import { withDefaults } from '@warp-drive/core/reactive';

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { name: 'firstName', kind: 'field' },
    { name: 'lastName', kind: 'field' },
    { name: 'age', kind: 'field', type: 'number' }
  ]
});
```

Each field has a `name` and a `kind`. You can optionally provide a `type` to hook into a Transformation (for example for dates, decimals or URLs).

## Why Use SimpleFields

SimpleFields give you a clear, explicit way to model primitive data in your application. They:

* Make your schema easier to read and maintain
* Integrate with Transformations for consistent data types
* Automatically stay reactive as data changes

Use SimpleFields for any basic property in your resource or embedded object.
