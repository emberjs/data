---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/schema-dsl/functions/object.md
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

Defined in: [fields/object.ts:62](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/schema-dsl/src/fields/object.ts#L62)

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

Defined in: [fields/object.ts:63](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/schema-dsl/src/fields/object.ts#L63)

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
