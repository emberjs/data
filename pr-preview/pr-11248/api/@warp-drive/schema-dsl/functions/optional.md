---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/schema-dsl/functions/optional.md
description: >-
  Reserved property decorator for marking a field optional in future generated
  create types; currently a no-op with no effect on the compiled schema.
---

# &#x20;optional()&#x20;

```ts
function optional(target: object, key: string): void;
```

Defined in: [fields/optional.ts:14](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/schema-dsl/src/fields/optional.ts#L14)

**`Decorator`**

Reserved for future compile-time type derivation (e.g. marking a field
optional in a resource's generated create variant type). Currently a
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
