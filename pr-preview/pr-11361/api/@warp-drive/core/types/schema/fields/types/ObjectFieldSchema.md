---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/schema/fields/types/ObjectFieldSchema.md
description: >-
  Union of the field schemas allowed in an `ObjectSchema`, which excludes
  identity and relationship fields.
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2265](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/schema/fields.ts#L2265)

A union of all possible field schemas that can be
used in an ObjectSchema.
