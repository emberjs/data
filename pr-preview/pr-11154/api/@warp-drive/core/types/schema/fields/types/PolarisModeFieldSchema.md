---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/fields/types/PolarisModeFieldSchema.md
---

# &#x20;PolarisModeFieldSchema

```ts
type PolarisModeFieldSchema = 
  | GenericField
  | PolarisAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2095](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L2095)

A union of all possible PolarisMode field schemas.

Available field schemas are:

* [GenericField](GenericField.md)
* [PolarisAliasField](PolarisAliasField.md)
* [LocalField](LocalField.md)
* [ObjectField](ObjectField.md)
* [SchemaObjectField](SchemaObjectField.md)
* [ArrayField](ArrayField.md)
* [SchemaArrayField](SchemaArrayField.md)
* [DerivedField](DerivedField.md)
* [ResourceField (not yet implemented)](ResourceField.md)
* [CollectionField (not yet implemented)](CollectionField.md)
* [LinksModeBelongsToField](LinksModeBelongsToField.md)
* [LinksModeHasManyField](LinksModeHasManyField.md)
