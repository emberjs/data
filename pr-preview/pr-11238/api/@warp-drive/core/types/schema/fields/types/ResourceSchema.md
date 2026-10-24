---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/core/types/schema/fields/types/ResourceSchema.md
description: >-
  Union of the PolarisMode and LegacyMode schema definitions for a primary
  resource type, as registered with the schema service.
---

# &#x20;ResourceSchema

```ts
type ResourceSchema = 
  | PolarisResourceSchema
  | LegacyResourceSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2497](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/types/schema/fields.ts#L2497)

A type which represents a valid JSON schema
definition for either a PolarisMode or a
LegacyMode resource.

The [ResourceSchemas](/guides/the-manual/schemas/resources/) guide shows how to
create and register one.

Note, this is separate from the type returned
by the SchemaService which provides fields as a Map
instead of as an Array.
