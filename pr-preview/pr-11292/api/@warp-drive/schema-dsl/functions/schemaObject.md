---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/functions/schemaObject.md
---

# &#x20;schemaObject()&#x20;

```ts
function schemaObject(options: SchemaObjectOptions): (target: object, key: string) => void;
```

Defined in: [fields/schema-object.ts:112](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/schema-object.ts#L112)

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
