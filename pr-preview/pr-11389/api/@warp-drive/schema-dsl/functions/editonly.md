---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/schema-dsl/functions/editonly.md
description: >-
  Reserved property decorator for marking a field edit-only in future generated
  types; currently a no-op with no effect on the compiled schema.
---

# &#x20;editonly()&#x20;

```ts
function editonly(target: object, key: string): void;
```

Defined in: [fields/editonly.ts:14](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/schema-dsl/src/fields/editonly.ts#L14)

**`Decorator`**

Reserved for future compile-time type derivation (e.g. omitting a field
from a resource's generated create variant type). Currently a no-op: it
has no effect on the compiled `JSON` schema, and stacking it with a field
decorator like [field](field.md) changes nothing about that field's compiled
output.

## Parameters

### target

`object`

### key

`string`

## Returns

`void`
