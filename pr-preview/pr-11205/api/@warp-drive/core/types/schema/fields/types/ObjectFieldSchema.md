---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/schema/fields/types/ObjectFieldSchema.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2175](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L2175)

A union of all possible field schemas that can be
used in an ObjectSchema.
