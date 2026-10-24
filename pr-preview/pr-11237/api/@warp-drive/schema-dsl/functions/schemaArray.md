---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/schema-dsl/functions/schemaArray.md
description: >-
  Property decorator that compiles to a schema-array field, an inline array of
  embedded objects whose shape is defined by an object schema.
---

# &#x20;schemaArray()&#x20;

```ts
function schemaArray(options: SchemaArrayOptions): (target: object, key: string) => void;
```

Defined in: [fields/schema-array.ts:136](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/schema-dsl/src/fields/schema-array.ts#L136)

**`Decorator`**

Marks a property as a [SchemaArrayField](../../core/types/schema/fields/types/SchemaArrayField.md) — an array of
embedded objects whose shape is described by an [ObjectSchema](ObjectSchema.md).

This is not a relationship. `@hasMany` / `CollectionField` point at
other resources by identity. A schema-array stores the objects inline
on the parent; its elements have no identity of their own.

For an array of primitives with no schema, use [array](array.md) instead.

## Parameters

### options

[`SchemaArrayOptions`](../types/SchemaArrayOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [post.ts]
import { Resource, field, schemaArray } from '@warp-drive/schema-dsl';

@Resource
export class Post {
  @field declare title: string;
  @schemaArray({ type: 'address', key: '@index', defaultValue: true })
  declare locations: Address[];
}
```

```json [compiled fields (excerpt)]
[
  {
    "kind": "schema-array",
    "name": "locations",
    "type": "address",
    "options": { "key": "@index", "defaultValue": true }
  }
]
```

:::
