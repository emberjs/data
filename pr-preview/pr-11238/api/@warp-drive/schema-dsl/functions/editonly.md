---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/schema-dsl/functions/editonly.md
description: >-
  Reserved property decorator for marking a field edit-only in future generated
  types; currently a no-op with no effect on the compiled schema.
---

# &#x20;editonly()&#x20;

```ts
function editonly(target: object, key: string): void;
```

Defined in: [fields/editonly.ts:14](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/schema-dsl/src/fields/editonly.ts#L14)

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
