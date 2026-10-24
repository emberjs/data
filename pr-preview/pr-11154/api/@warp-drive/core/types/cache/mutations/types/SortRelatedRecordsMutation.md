---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/cache/mutations/types/SortRelatedRecordsMutation.md
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

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:129](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/mutations.ts#L129)

Reorders the local (uncommitted) state of a `to-many` relationship.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:141](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/mutations.ts#L141)

The name of the relationship to reorder

***

### op

```ts
op: "sortRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:133](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/mutations.ts#L133)

The name of the mutation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:137](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/mutations.ts#L137)

The cache key for the resource whose relationship is being reordered

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:145](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/mutations.ts#L145)

The relationship's members in their new order
