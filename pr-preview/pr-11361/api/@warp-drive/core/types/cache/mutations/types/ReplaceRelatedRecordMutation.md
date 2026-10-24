---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/cache/mutations/types/ReplaceRelatedRecordMutation.md
description: >-
  Cache mutation passed to `cache.mutate` that sets a to-one relationship's
  local value, or swaps a single member of a to-many.
---

# &#x20;ReplaceRelatedRecordMutation

```ts
interface ReplaceRelatedRecordMutation {
  field: string;
  index?: number;
  op: "replaceRelatedRecord";
  prior?: ResourceKey;
  record: ResourceKey;
  value: ResourceKey | null;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:80](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L80)

Replaces the local (uncommitted) state of a `to-one` relationship
with a new value.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:92](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L92)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:105](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L105)

If the field is a collection relationship, the index at which the swap occurred

***

### op

```ts
op: "replaceRelatedRecord";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:84](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L84)

The name of the mutation

***

### prior?

```ts
optional prior?: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:101](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L101)

If the field is a collection relationship, the value being swapped out

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:88](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L88)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey | null;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:97](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/cache/mutations.ts#L97)

The new value for the relationship. Never `null` if the field is
actually a collection relationship.
