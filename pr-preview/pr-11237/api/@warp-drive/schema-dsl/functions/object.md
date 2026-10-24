---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/schema-dsl/functions/object.md
description: >-
  Property decorator that compiles to an object field, a map of primitive values
  with no defined shape; use `schemaObject` for shaped objects.
---

# &#x20;object()

```ts
function object(target: object, key: string): void;
function object(options: ObjectFieldOptions): (target: object, key: string) => void;
```

## Call Signature

```ts
function object(target: object, key: string): void;
```

Defined in: [fields/object.ts:66](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/schema-dsl/src/fields/object.ts#L66)

**`Decorator`**

Marks a property as an [ObjectField](../../core/types/schema/fields/types/ObjectField.md) — an object whose keys
point to primitive values with no well-defined shape. For objects with a
well-defined shape, use [schemaObject](schemaObject.md) with an
[ObjectSchema](ObjectSchema.md) instead.

### Parameters

#### target

`object`

#### key

`string`

### Returns

`void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field, object } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare name: string;
  @object declare metadata: Record<string, unknown>;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "object", "name": "metadata" }
]
```

:::

## Call Signature

```ts
function object(options: ObjectFieldOptions): (target: object, key: string) => void;
```

Defined in: [fields/object.ts:67](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/schema-dsl/src/fields/object.ts#L67)

**`Decorator`**

Marks a property as an [ObjectField](../../core/types/schema/fields/types/ObjectField.md) — an object whose keys
point to primitive values with no well-defined shape. For objects with a
well-defined shape, use [schemaObject](schemaObject.md) with an
[ObjectSchema](ObjectSchema.md) instead.

### Parameters

#### options

[`ObjectFieldOptions`](../types/ObjectFieldOptions.md)

### Returns

(`target`: `object`, `key`: `string`) => `void`

### Example

::: code-group

```ts [user.ts]
import { Resource, field, object } from '@warp-drive/schema-dsl';

@Resource
export class User {
  @field declare name: string;
  @object declare metadata: Record<string, unknown>;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "object", "name": "metadata" }
]
```

:::
