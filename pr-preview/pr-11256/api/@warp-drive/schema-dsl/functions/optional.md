---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/schema-dsl/functions/optional.md
description: >-
  Reserved property decorator for marking a field optional in future generated
  create types; currently a no-op with no effect on the compiled schema.
---

# &#x20;optional()&#x20;

```ts
function optional(target: object, key: string): void;
```

Defined in: [fields/optional.ts:14](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/schema-dsl/src/fields/optional.ts#L14)

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
