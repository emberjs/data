---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/graph/types/ReplaceRelatedRecordOperation.md
---

# &#x20;ReplaceRelatedRecordOperation

```ts
interface ReplaceRelatedRecordOperation {
  field: string;
  index?: number;
  op: "replaceRelatedRecord";
  prior?: ResourceKey;
  record: ResourceKey;
  value: ResourceKey | null;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:88](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L88)

Replaces the state of a `to-one` relationship on the Graph with a new value.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:100](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L100)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:113](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L113)

If the field is a collection relationship, the index at which the swap occurred

***

### op

```ts
op: "replaceRelatedRecord";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:92](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L92)

The name of the operation

***

### prior?

```ts
optional prior?: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:109](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L109)

If the field is a collection relationship, the value being swapped out

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:96](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L96)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey | null;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:105](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/graph.ts#L105)

The new value for the relationship. Never `null` if the field is
actually a collection relationship.
