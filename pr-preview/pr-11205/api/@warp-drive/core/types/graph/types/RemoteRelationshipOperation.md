---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/graph/types/RemoteRelationshipOperation.md
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

Defined in: [warp-drive-packages/core/src/types/graph.ts:185](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/graph.ts#L185)

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
