---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/graph/types/LocalRelationshipOperation.md
description: >-
  Union of the Graph operations that update a relationship's local (uncommitted)
  state.
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

Defined in: [warp-drive-packages/core/src/types/graph.ts:232](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/graph.ts#L232)

The Graph operations that apply to a relationship's local
(uncommitted/dirty) state.

See also:

* [ReplaceRelatedRecordsOperation](ReplaceRelatedRecordsOperation.md)
* [ReplaceRelatedRecordOperation](ReplaceRelatedRecordOperation.md)
* [AddResourceMutation](../../cache/mutations/types/AddToResourceRelationshipMutation.md)
* [RemoveResourceMutation](../../cache/mutations/types/RemoveFromResourceRelationshipMutation.md)
* [SortRelatedRecords](SortRelatedRecords.md)
