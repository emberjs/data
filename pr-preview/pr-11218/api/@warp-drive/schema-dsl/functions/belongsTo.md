---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/schema-dsl/functions/belongsTo.md
description: >-
  LEGACY property decorator that compiles to a belongsTo relationship field,
  valid only on resources declared with `@Resource({ legacy: true })`.
---

# &#x20;belongsTo()&#x20;

```ts
function belongsTo(options: BelongsToOptions): (target: object, key: string) => void;
```

Defined in: [fields/belongs-to.ts:102](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L102)

**`Decorator`**

> \[!CAUTION]
> This decorator is LEGACY, and only valid on resources decorated with
> `@Resource({ legacy: true })`.

Marks a property as a [LegacyBelongsToField](../../core/types/schema/fields/types/LegacyBelongsToField.md) for use with
`@warp-drive/legacy/model`.

## Parameters

### options

[`BelongsToOptions`](../types/BelongsToOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [comment.ts]
import { Resource, belongsTo } from '@warp-drive/schema-dsl';

@Resource({ legacy: true })
export class Comment {
  @belongsTo({ type: 'post', inverse: 'comments', async: true })
  declare post: unknown;
}
```

```json [compiled fields (excerpt)]
[
  {
    "kind": "belongsTo",
    "name": "post",
    "type": "post",
    "options": { "async": true, "inverse": "comments" }
  }
]
```

:::
