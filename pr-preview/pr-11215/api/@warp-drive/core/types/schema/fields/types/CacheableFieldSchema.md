---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/schema/fields/types/CacheableFieldSchema.md
description: >-
  Union of the field schemas whose values live in the cache, excluding alias,
  local, and derived fields.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2289](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/schema/fields.ts#L2289)

A union of all possible LegacyMode and PolarisMode
field schemas that represent data that could be in
the cache.

In other words this will not include types like alias
fields, local fields, or derived fields.
