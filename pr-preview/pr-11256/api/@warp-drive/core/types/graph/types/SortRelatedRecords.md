---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/graph/types/SortRelatedRecords.md
description: Graph operation that reorders the members of a to-many relationship.
---

# &#x20;SortRelatedRecords

```ts
interface SortRelatedRecords {
  field: string;
  op: "sortRelatedRecords";
  record: ResourceKey;
  value: ResourceKey[];
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:139](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L139)

Reorders the state of a `to-many` relationship on the Graph.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:151](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L151)

The name of the relationship to reorder

***

### op

```ts
op: "sortRelatedRecords";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:143](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L143)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:147](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L147)

The cache key for the resource whose relationship is being reordered

***

### value

```ts
value: ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:155](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L155)

The relationship's members in their new order
