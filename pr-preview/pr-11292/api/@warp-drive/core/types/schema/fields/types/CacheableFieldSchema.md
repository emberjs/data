---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/schema/fields/types/CacheableFieldSchema.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2154](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/schema/fields.ts#L2154)

A union of all possible LegacyMode and PolarisMode
field schemas that represent data that could be in
the cache.

In other words this will not include types like alias
fields, local fields, or derived fields.
