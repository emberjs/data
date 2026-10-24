---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/cache/mutations/types/ReplaceRelatedRecordsMutation.md
description: >-
  Cache mutation passed to `cache.mutate` that replaces or splices a to-many
  relationship's local members.
---

# &#x20;ReplaceRelatedRecordsMutation

```ts
interface ReplaceRelatedRecordsMutation {
  field: string;
  index?: number;
  op: "replaceRelatedRecords";
  prior?: ResourceKey[];
  record: ResourceKey;
  value: ResourceKey[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:115](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L115)

Replaces the local (uncommitted) state of a `to-many` relationship
with a new set of values.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:127](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L127)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:141](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L141)

If this is a "splice", the index to start from

***

### op

```ts
op: "replaceRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:119](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L119)

The name of the mutation

***

### prior?

```ts
optional prior?: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:137](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L137)

If this is a "splice", the resources expected to be removed

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:123](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L123)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:133](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/mutations.ts#L133)

The resources to add. If neither [prior](#prior)
nor [index](#index) is specified, all
existing members should be removed.
