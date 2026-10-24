---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/types/schema/fields/types/LegacyField.md
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

Defined in: [warp-drive-packages/core/src/types/schema/fields.ts:2702](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/types/schema/fields.ts#L2702)

A union of all field schemas considered "legacy", i.e. those historically
associated with `@warp-drive/legacy/model`'s Attribute, BelongsTo and
HasMany fields, including their LinksMode variants.

Available field schemas are:

* [LegacyAttributeField](LegacyAttributeField.md)
* [LegacyBelongsToField](LegacyBelongsToField.md)
* [LegacyHasManyField](LegacyHasManyField.md)
* [LinksModeBelongsToField](LinksModeBelongsToField.md)
* [LinksModeHasManyField](LinksModeHasManyField.md)
