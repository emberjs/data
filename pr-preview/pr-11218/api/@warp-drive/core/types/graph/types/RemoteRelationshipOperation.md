---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/types/graph/types/RemoteRelationshipOperation.md
description: >-
  Union of the Graph operations that update a relationship's remote (persisted)
  state.
---

# &#x20;RemoteRelationshipOperation

```ts
type RemoteRelationshipOperation = 
  | UpdateResourceRelationshipOperation
  | UpdateRelationshipOperation
  | ReplaceRelatedRecordOperation
  | ReplaceRelatedRecordsOperation
  | RemoveFromResourceRelationshipOperation
  | AddToResourceRelationshipOperation
  | DeleteRecordOperation
  | SortRelatedRecords;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:209](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/graph.ts#L209)

The Graph operations that apply to a relationship's remote
(persisted/clean) state.

See also:

* [UpdateResourceRelationshipOperation](../../cache/operations/types/UpdateResourceRelationshipOperation.md)
* [UpdateRelationshipOperation](UpdateRelationshipOperation.md)
* [ReplaceRelatedRecordOperation](ReplaceRelatedRecordOperation.md)
* [ReplaceRelatedRecordsOperation](ReplaceRelatedRecordsOperation.md)
* [RemoveResourceOperation](../../cache/operations/types/RemoveFromResourceRelationshipOperation.md)
* [AddResourceOperation](../../cache/operations/types/AddToResourceRelationshipOperation.md)
* [DeleteRecordOperation](DeleteRecordOperation.md)
* [SortRelatedRecords](SortRelatedRecords.md)
