---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/schema/fields/types/FieldSchema.md
---

# &#x20;FieldSchema

```ts
type FieldSchema = 
  | GenericField
  | LegacyAliasField
  | PolarisAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField
  | ResourceField
  | CollectionField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2126](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/schema/fields.ts#L2126)

A union of all possible LegacyMode and PolarisMode
field schemas.

You likely will want to use PolarisModeFieldSchema,
LegacyModeFieldSchema, or ObjectFieldSchema instead
as appropriate as they are more specific and will
provide better guidance around what is valid.
