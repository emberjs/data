---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/schema/fields/types/ObjectFieldSchema.md
---

# &#x20;ObjectFieldSchema

```ts
type ObjectFieldSchema = 
  | LegacyAttributeField
  | GenericField
  | ObjectAliasField
  | LocalField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | DerivedField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2169](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/schema/fields.ts#L2169)

A union of all possible field schemas that can be
used in an ObjectSchema.
