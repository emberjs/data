---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/schema/fields/types/ResourceSchema.md
---

# &#x20;ResourceSchema

```ts
type ResourceSchema = 
  | PolarisResourceSchema
  | LegacyResourceSchema;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2349](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L2349)

A type which represents a valid JSON schema
definition for either a PolarisMode or a
LegacyMode resource.

Note, this is separate from the type returned
by the SchemaService which provides fields as a Map
instead of as an Array.
