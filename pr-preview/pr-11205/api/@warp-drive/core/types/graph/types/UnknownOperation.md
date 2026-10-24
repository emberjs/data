---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/graph/types/UnknownOperation.md
---

# &#x20;UnknownOperation

```ts
interface UnknownOperation {
  field: string;
  op: "never";
  record: ResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:70](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/graph.ts#L70)

A placeholder operation for a relationship whose kind (`to-one` vs
`to-many`) is not yet known to the Graph.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:82](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/graph.ts#L82)

The name of the relationship

***

### op

```ts
op: "never";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:74](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/graph.ts#L74)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:78](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/graph.ts#L78)

The cache key for the resource whose relationship is affected
