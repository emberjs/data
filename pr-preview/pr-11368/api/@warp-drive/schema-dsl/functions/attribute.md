---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/schema-dsl/functions/attribute.md
description: >-
  LEGACY property decorator that compiles to an attribute field for
  `@warp-drive/legacy/model` resources; prefer `field` for new schemas.
---

# &#x20;attribute()

```ts
function attribute(target: object, key: string): void;
function attribute(options: AttributeOptions): (target: object, key: string) => void;
```

## Call Signature

```ts
function attribute(target: object, key: string): void;
```

Defined in: [fields/attribute.ts:64](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L64)

**`Decorator`**

> \[!CAUTION]
> This decorator is LEGACY. Prefer [field](field.md) for new schemas; only use
> this decorator on resources decorated with `@Resource({ legacy: true })`.

Marks a property as a [LegacyAttributeField](../../core/types/schema/fields/types/LegacyAttributeField.md) for use with
`@warp-drive/legacy/model`.

### Parameters

#### target

`object`

#### key

`string`

### Returns

`void`

### Example

::: code-group

```ts [comment.ts]
import { Resource, attribute } from '@warp-drive/schema-dsl';

@Resource({ legacy: true })
export class Comment {
  @attribute({ type: 'string' }) declare author: string;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "attribute", "name": "author", "type": "string" }
]
```

:::

## Call Signature

```ts
function attribute(options: AttributeOptions): (target: object, key: string) => void;
```

Defined in: [fields/attribute.ts:65](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L65)

**`Decorator`**

> \[!CAUTION]
> This decorator is LEGACY. Prefer [field](field.md) for new schemas; only use
> this decorator on resources decorated with `@Resource({ legacy: true })`.

Marks a property as a [LegacyAttributeField](../../core/types/schema/fields/types/LegacyAttributeField.md) for use with
`@warp-drive/legacy/model`.

### Parameters

#### options

[`AttributeOptions`](../types/AttributeOptions.md)

### Returns

(`target`: `object`, `key`: `string`) => `void`

### Example

::: code-group

```ts [comment.ts]
import { Resource, attribute } from '@warp-drive/schema-dsl';

@Resource({ legacy: true })
export class Comment {
  @attribute({ type: 'string' }) declare author: string;
}
```

```json [compiled fields (excerpt)]
[
  { "kind": "attribute", "name": "author", "type": "string" }
]
```

:::
