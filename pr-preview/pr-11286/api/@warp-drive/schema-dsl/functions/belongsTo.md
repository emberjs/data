---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/functions/belongsTo.md
---

# &#x20;belongsTo()&#x20;

```ts
function belongsTo(options: BelongsToOptions): (target: object, key: string) => void;
```

Defined in: [fields/belongs-to.ts:98](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/belongs-to.ts#L98)

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
