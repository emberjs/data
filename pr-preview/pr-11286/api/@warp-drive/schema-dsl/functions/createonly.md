---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/schema-dsl/functions/createonly.md
---

# &#x20;createonly()&#x20;

```ts
function createonly(target: object, key: string): void;
```

Defined in: [fields/createonly.ts:12](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/schema-dsl/src/fields/createonly.ts#L12)

**`Decorator`**

Reserved for future compile-time type derivation (e.g. omitting a field
from a resource's generated edit variant type). Currently a no-op: it has
no effect on the compiled `JSON` schema, and stacking it with a field
decorator like [field](field.md) changes nothing about that field's compiled
output.

## Parameters

### target

`object`

### key

`string`

## Returns

`void`
