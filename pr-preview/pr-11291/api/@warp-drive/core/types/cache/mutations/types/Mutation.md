---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/types/cache/mutations/types/Mutation.md
description: >-
  Union of the relationship changes `cache.mutate` applies to local
  (uncommitted) state rather than remote state.
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

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:193](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/cache/mutations.ts#L193)

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
