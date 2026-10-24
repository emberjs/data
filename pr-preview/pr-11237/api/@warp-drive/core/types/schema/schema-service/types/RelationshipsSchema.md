---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/types/schema/schema-service/types/RelationshipsSchema.md
description: >-
  Legacy relationship field definitions keyed by relationship name, returned by
  the deprecated `relationshipsDefinitionFor` schema hook.
---

# &#x20;RelationshipsSchema

```ts
type RelationshipsSchema = Record<string, LegacyRelationshipField>;
```

Defined in: [warp-drive-packages/core/src/types/schema/schema-service.ts:47](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/schema/schema-service.ts#L47)

A dictionary of [LegacyRelationshipField](../../fields/types/LegacyRelationshipField.md) definitions keyed by
relationship name, as returned by the deprecated
[relationshipsDefinitionFor](SchemaService.md#relationshipsdefinitionfor) hook.
