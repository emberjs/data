---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/schema/fields/types/FieldSchema.md
description: >-
  Union of every LegacyMode and PolarisMode field schema; prefer the
  mode-specific unions for more precise type-checking.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2214](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/schema/fields.ts#L2214)

A union of all possible LegacyMode and PolarisMode
field schemas.

You likely will want to use PolarisModeFieldSchema,
LegacyModeFieldSchema, or ObjectFieldSchema instead
as appropriate as they are more specific and will
provide better guidance around what is valid.
