---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/types/schema/fields/functions/isResourceSchema.md
description: >-
  Type guard that returns true when a schema is a resource schema, meaning its
  identity field is of kind `@id`.
---

# &#x20;isResourceSchema()

```ts
function isResourceSchema(schema: 
  | ObjectSchema
  | ResourceSchema): schema is ResourceSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2664](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/schema/fields.ts#L2664)

A type utility to narrow a schema to a ResourceSchema

## Parameters

### schema

| [`ObjectSchema`](../types/ObjectSchema.md)
| [`ResourceSchema`](../types/ResourceSchema.md)

## Returns

`schema is ResourceSchema`
