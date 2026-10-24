---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/cache/mutations/types/ReplaceRelatedRecordMutation.md
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

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:65](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L65)

Replaces the local (uncommitted) state of a `to-one` relationship
with a new value.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:77](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L77)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:90](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L90)

If the field is a collection relationship, the index at which the swap occurred

***

### op

```ts
op: "replaceRelatedRecord";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:69](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L69)

The name of the mutation

***

### prior?

```ts
optional prior?: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:86](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L86)

If the field is a collection relationship, the value being swapped out

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:73](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L73)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey | null;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:82](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L82)

The new value for the relationship. Never `null` if the field is
actually a collection relationship.
