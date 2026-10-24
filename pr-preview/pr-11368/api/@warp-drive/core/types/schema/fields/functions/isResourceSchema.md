---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/schema/fields/functions/isResourceSchema.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2670](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L2670)

A type utility to narrow a schema to a ResourceSchema

## Parameters

### schema

| [`ObjectSchema`](../types/ObjectSchema.md)
| [`ResourceSchema`](../types/ResourceSchema.md)

## Returns

`schema is ResourceSchema`
