---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/schema-dsl/functions/readonly.md
description: >-
  Reserved property decorator for marking a field read-only in future generated
  types; currently a no-op with no effect on the compiled schema.
---

# &#x20;readonly()&#x20;

```ts
function readonly(target: object, key: string): void;
```

Defined in: [fields/readonly.ts:14](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/schema-dsl/src/fields/readonly.ts#L14)

**`Decorator`**

Reserved for future compile-time type derivation (e.g. omitting a field
from a resource's generated create/edit variant types). Currently a
no-op: it has no effect on the compiled `JSON` schema, and stacking it
with a field decorator like [field](field.md) changes nothing about that
field's compiled output.

## Parameters

### target

`object`

### key

`string`

## Returns

`void`
