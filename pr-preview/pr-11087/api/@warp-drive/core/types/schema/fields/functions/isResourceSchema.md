---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/types/schema/fields/functions/isResourceSchema.md
---

# &#x20;isResourceSchema()

```ts
function isResourceSchema(schema: 
  | ObjectSchema
  | ResourceSchema): schema is ResourceSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2533](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/schema/fields.ts#L2533)

A type utility to narrow a schema to a ResourceSchema

## Parameters

### schema

| [`ObjectSchema`](../types/ObjectSchema.md)
| [`ResourceSchema`](../types/ResourceSchema.md)

## Returns

`schema is ResourceSchema`
