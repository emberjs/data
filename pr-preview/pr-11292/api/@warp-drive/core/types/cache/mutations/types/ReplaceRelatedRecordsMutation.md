---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/cache/mutations/types/ReplaceRelatedRecordsMutation.md
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

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:97](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L97)

Replaces the local (uncommitted) state of a `to-many` relationship
with a new set of values.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:109](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L109)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:123](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L123)

If this is a "splice", the index to start from

***

### op

```ts
op: "replaceRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:101](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L101)

The name of the mutation

***

### prior?

```ts
optional prior?: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:119](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L119)

If this is a "splice", the resources expected to be removed

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:105](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L105)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:115](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/cache/mutations.ts#L115)

The resources to add. If neither [prior](#prior)
nor [index](#index) is specified, all
existing members should be removed.
