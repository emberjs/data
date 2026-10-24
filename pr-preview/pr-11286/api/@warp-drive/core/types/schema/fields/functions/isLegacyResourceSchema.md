---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/schema/fields/functions/isLegacyResourceSchema.md
---

# &#x20;isLegacyResourceSchema()

```ts
function isLegacyResourceSchema(schema: 
  | ObjectSchema
  | ResourceSchema): schema is LegacyResourceSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2548](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2548)

A type utility to narrow a schema to LegacyResourceSchema

## Parameters

### schema

| [`ObjectSchema`](../types/ObjectSchema.md)
| [`ResourceSchema`](../types/ResourceSchema.md)

## Returns

`schema is LegacyResourceSchema`
