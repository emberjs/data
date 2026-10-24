---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/schema-dsl/functions/array.md
description: >-
  Property decorator that compiles to an array field holding primitive values;
  use `schemaArray` for arrays of structured objects.
---

# &#x20;array()

```ts
function array(target: object, key: string): void;
function array(options: ArrayFieldOptions): (target: object, key: string) => void;
```

## Call Signature

```ts
function array(target: object, key: string): void;
```

Defined in: [fields/array.ts:64](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/array.ts#L64)

**`Decorator`**

Marks a property as an [ArrayField](../../core/types/schema/fields/types/ArrayField.md) — an array of primitive
values. For arrays of well-defined objects, use [schemaArray](schemaArray.md).

### Parameters

#### target

`object`

#### key

`string`

### Returns

`void`

### Example

::: code-group

```ts [post.ts]
import { Resource, field, array } from '@warp-drive/schema-dsl';

@Resource
export class Post {
  @field declare title: string;
  @array declare tags: string[];
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "array", "name": "tags" }
]
```

:::

## Call Signature

```ts
function array(options: ArrayFieldOptions): (target: object, key: string) => void;
```

Defined in: [fields/array.ts:65](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/array.ts#L65)

**`Decorator`**

Marks a property as an [ArrayField](../../core/types/schema/fields/types/ArrayField.md) — an array of primitive
values. For arrays of well-defined objects, use [schemaArray](schemaArray.md).

### Parameters

#### options

[`ArrayFieldOptions`](../types/ArrayFieldOptions.md)

### Returns

(`target`: `object`, `key`: `string`) => `void`

### Example

::: code-group

```ts [post.ts]
import { Resource, field, array } from '@warp-drive/schema-dsl';

@Resource
export class Post {
  @field declare title: string;
  @array declare tags: string[];
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "array", "name": "tags" }
]
```

:::
