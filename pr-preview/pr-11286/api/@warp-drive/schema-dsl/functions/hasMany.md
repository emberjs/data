---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/functions/hasMany.md
---

# &#x20;hasMany()&#x20;

```ts
function hasMany(options: HasManyOptions): (target: object, key: string) => void;
```

Defined in: [fields/has-many.ts:98](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L98)

**`Decorator`**

> \[!CAUTION]
> This decorator is LEGACY, and only valid on resources decorated with
> `@Resource({ legacy: true })`.

Marks a property as a [LegacyHasManyField](../../core/types/schema/fields/types/LegacyHasManyField.md) for use with
`@warp-drive/legacy/model`.

## Parameters

### options

[`HasManyOptions`](../types/HasManyOptions.md)

## Returns

(`target`: `object`, `key`: `string`) => `void`

## Example

::: code-group

```ts [user.ts]
import { Resource, hasMany } from '@warp-drive/schema-dsl';

@Resource({ legacy: true })
export class User {
  @hasMany({ type: 'comment', inverse: null, async: false })
  declare replies: unknown[];
}
```

```json [compiled fields (excerpt)]
[
  {
    "kind": "hasMany",
    "name": "replies",
    "type": "comment",
    "options": { "async": false, "inverse": null }
  }
]
```

:::
