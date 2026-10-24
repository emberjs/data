---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/schema-dsl/functions/schemaObject.md
description: >-
  Property decorator that compiles to a schema-object field, an inline embedded
  object whose shape is defined by an object schema.
---

# &#x20;schemaObject()&#x20;

```ts
function schemaObject(options: SchemaObjectOptions): (target: object, key: string) => void;
```

Defined in: [fields/schema-object.ts:116](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L116)

**`Decorator`**

Marks a property as a [SchemaObjectField](../../core/types/schema/fields/types/SchemaObjectField.md) — an embedded
object whose shape is described by an [ObjectSchema](ObjectSchema.md).

This is not a relationship. `@belongsTo` / `ResourceField` point at
another resource by identity. A schema-object is stored inline on the
parent and has no identity of its own.

For a bag of primitives with no schema, use [object](object.md) instead.

## Parameters

### options

[`SchemaObjectOptions`](../types/SchemaObjectOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [user.ts]
import { Resource, field, schemaObject } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare name: string;
  @schemaObject({ type: 'address' }) declare address: Address;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "schema-object", "name": "address", "type": "address" }
]
```

:::
