---
url: /pr-preview/pr-11087/api/@warp-drive/schema-dsl/functions/optional.md
---

# &#x20;optional()&#x20;

```ts
function optional(target: object, key: string): void;
```

Defined in: [fields/optional.ts:12](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/schema-dsl/src/fields/optional.ts#L12)

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
