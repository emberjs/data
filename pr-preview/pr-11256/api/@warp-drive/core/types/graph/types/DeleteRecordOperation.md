---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/graph/types/DeleteRecordOperation.md
description: >-
  Graph operation signaling that a resource was deleted so it is removed from
  every relationship that references it.
---

# &#x20;DeleteRecordOperation

```ts
interface DeleteRecordOperation {
  isNew: boolean;
  op: "deleteRecord";
  record: ResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:64](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L64)

Signals to the Graph that a resource has been deleted, so that
it can be removed from any relationships that reference it.

## Properties

### isNew

```ts
isNew: boolean;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:76](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L76)

Whether the resource was a client-created resource that had not yet been persisted

***

### op

```ts
op: "deleteRecord";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:68](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L68)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:72](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/graph.ts#L72)

The cache key for the resource that was deleted
