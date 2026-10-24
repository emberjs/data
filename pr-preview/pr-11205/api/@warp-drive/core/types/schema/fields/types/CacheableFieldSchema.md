---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/schema/fields/types/CacheableFieldSchema.md
---

# &#x20;CacheableFieldSchema

```ts
type CacheableFieldSchema = 
  | IdentityField
  | GenericField
  | ObjectField
  | SchemaObjectField
  | ArrayField
  | SchemaArrayField
  | ResourceField
  | CollectionField
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2154](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/schema/fields.ts#L2154)

A union of all possible LegacyMode and PolarisMode
field schemas that represent data that could be in
the cache.

In other words this will not include types like alias
fields, local fields, or derived fields.
