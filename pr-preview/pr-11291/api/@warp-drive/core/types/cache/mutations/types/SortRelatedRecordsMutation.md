---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/types/cache/mutations/types/SortRelatedRecordsMutation.md
description: >-
  Cache mutation passed to `cache.mutate` that reorders a to-many relationship's
  local members.
---

# &#x20;SortRelatedRecordsMutation

```ts
interface SortRelatedRecordsMutation {
  field: string;
  op: "sortRelatedRecords";
  record: ResourceKey;
  value: ResourceKey[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:149](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/cache/mutations.ts#L149)

Reorders the local (uncommitted) state of a `to-many` relationship.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:161](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/cache/mutations.ts#L161)

The name of the relationship to reorder

***

### op

```ts
op: "sortRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:153](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/cache/mutations.ts#L153)

The name of the mutation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:157](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/cache/mutations.ts#L157)

The cache key for the resource whose relationship is being reordered

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:165](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/cache/mutations.ts#L165)

The relationship's members in their new order
