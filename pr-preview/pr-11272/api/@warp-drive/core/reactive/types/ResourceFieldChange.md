---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/reactive/types/ResourceFieldChange.md
---

# &#x20;ResourceFieldChange

```ts
type ResourceFieldChange = 
  | FieldChange
  | RelationshipDiff;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/resource-state.ts:49](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/reactive/-private/resource-state.ts#L49)

The local change to a single field of a resource: a [FieldChange](FieldChange.md)
for a non-relationship field, or a [RelationshipDiff](../../types/cache/types/RelationshipDiff.md) for a
relationship.
