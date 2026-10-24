---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/graph/types/LocalRelationshipOperation.md
---

# &#x20;LocalRelationshipOperation

```ts
type LocalRelationshipOperation = 
  | ReplaceRelatedRecordsOperation
  | ReplaceRelatedRecordOperation
  | AddToResourceRelationshipMutation
  | RemoveFromResourceRelationshipMutation
  | SortRelatedRecords;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:206](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/graph.ts#L206)

The Graph operations that apply to a relationship's local
(uncommitted/dirty) state.

See also:

* [ReplaceRelatedRecordsOperation](ReplaceRelatedRecordsOperation.md)
* [ReplaceRelatedRecordOperation](ReplaceRelatedRecordOperation.md)
* [AddResourceMutation](../../cache/mutations/types/AddToResourceRelationshipMutation.md)
* [RemoveResourceMutation](../../cache/mutations/types/RemoveFromResourceRelationshipMutation.md)
* [SortRelatedRecords](SortRelatedRecords.md)
