---
url: /pr-preview/pr-11154/api/@warp-drive/schema-dsl/functions/attribute.md
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

Defined in: [fields/attribute.ts:60](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L60)

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

Defined in: [fields/attribute.ts:61](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/schema-dsl/src/fields/attribute.ts#L61)

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
