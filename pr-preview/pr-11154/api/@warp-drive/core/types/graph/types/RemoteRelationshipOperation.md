---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/graph/types/RemoteRelationshipOperation.md
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

Defined in: [warp-drive-packages/core/src/types/graph.ts:185](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L185)

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
