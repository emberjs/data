---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/schema-dsl/functions/hasMany.md
description: >-
  LEGACY property decorator that compiles to a hasMany relationship field, valid
  only on resources declared with `@Resource({ legacy: true })`.
---

# &#x20;hasMany()&#x20;

```ts
function hasMany(options: HasManyOptions): (target: object, key: string) => void;
```

Defined in: [fields/has-many.ts:102](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/schema-dsl/src/fields/has-many.ts#L102)

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
