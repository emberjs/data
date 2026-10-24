---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/schema/fields/types/LegacyField.md
description: >-
  Union of the legacy attribute, belongsTo, and hasMany field schemas, including
  the LinksMode relationship variants.
---

# &#x20;LegacyField

```ts
type LegacyField = 
  | LegacyAttributeField
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField;
```

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2771](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/schema/fields.ts#L2771)

A union of all field schemas considered "legacy", i.e. those historically
associated with `@warp-drive/legacy/model`'s Attribute, BelongsTo and
HasMany fields, including their LinksMode variants.

Available field schemas are:

* [LegacyAttributeField](LegacyAttributeField.md)
* [LegacyBelongsToField](LegacyBelongsToField.md)
* [LegacyHasManyField](LegacyHasManyField.md)
* [LinksModeBelongsToField](LinksModeBelongsToField.md)
* [LinksModeHasManyField](LinksModeHasManyField.md)
