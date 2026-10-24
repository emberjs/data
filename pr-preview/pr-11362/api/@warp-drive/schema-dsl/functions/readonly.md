---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/schema-dsl/functions/readonly.md
description: >-
  Reserved property decorator for marking a field read-only in future generated
  types; currently a no-op with no effect on the compiled schema.
---

# &#x20;readonly()&#x20;

```ts
function readonly(target: object, key: string): void;
```

Defined in: [fields/readonly.ts:14](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/schema-dsl/src/fields/readonly.ts#L14)

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
