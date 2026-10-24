---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/schema-dsl/functions/createonly.md
description: >-
  Reserved property decorator for marking a field create-only in future
  generated types; currently a no-op with no effect on the compiled schema.
---

# &#x20;createonly()&#x20;

```ts
function createonly(target: object, key: string): void;
```

Defined in: [fields/createonly.ts:14](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/schema-dsl/src/fields/createonly.ts#L14)

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
