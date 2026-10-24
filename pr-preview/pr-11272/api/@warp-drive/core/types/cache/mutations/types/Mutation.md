---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/cache/mutations/types/Mutation.md
---

# &#x20;Mutation

```ts
type Mutation = 
  | ReplaceRelatedRecordsMutation
  | ReplaceRelatedRecordMutation
  | RemoveFromResourceRelationshipMutation
  | AddToResourceRelationshipMutation
  | SortRelatedRecordsMutation;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:171](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/mutations.ts#L171)

A `Mutation` is an action that updates the local (uncommitted or "dirty")
state of the [Cache](../../types/Cache.md) in some manner.

Most Mutations are in theory also [Operations](../../operations/types/Operation.md); the
difference is that the change should be applied as local/dirty state
instead of as remote/clean state.

Mutations are applied via [Cache.mutate](../../types/Cache.md#mutate).

See also:

* [ReplaceRelatedRecordsMutation](ReplaceRelatedRecordsMutation.md)
* [ReplaceRelatedRecordMutation](ReplaceRelatedRecordMutation.md)
* [RemoveFromResourceRelationshipMutation](RemoveFromResourceRelationshipMutation.md)
* [AddToResourceRelationshipMutation](AddToResourceRelationshipMutation.md)
* [SortRelatedRecordsMutation](SortRelatedRecordsMutation.md)
