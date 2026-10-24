---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/schema-dsl/functions/editonly.md
---

# &#x20;editonly()&#x20;

```ts
function editonly(target: object, key: string): void;
```

Defined in: [fields/editonly.ts:12](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/schema-dsl/src/fields/editonly.ts#L12)

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
