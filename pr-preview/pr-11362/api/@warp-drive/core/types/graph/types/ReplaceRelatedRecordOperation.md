---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/types/graph/types/ReplaceRelatedRecordOperation.md
description: >-
  Graph operation that sets a to-one relationship's value, or swaps a single
  member of a to-many.
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

Defined in: [warp-drive-packages/core/src/types/graph.ts:106](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L106)

Replaces the state of a `to-one` relationship on the Graph with a new value.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:118](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L118)

The name of the relationship to replace

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:131](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L131)

If the field is a collection relationship, the index at which the swap occurred

***

### op

```ts
op: "replaceRelatedRecord";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:110](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L110)

The name of the operation

***

### prior?

```ts
optional prior?: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:127](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L127)

If the field is a collection relationship, the value being swapped out

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:114](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L114)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: ResourceKey | null;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:123](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/graph.ts#L123)

The new value for the relationship. Never `null` if the field is
actually a collection relationship.
