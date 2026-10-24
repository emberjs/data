---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/graph/types/DeleteRecordOperation.md
---

# &#x20;DeleteRecordOperation

```ts
interface DeleteRecordOperation {
  isNew: boolean;
  op: "deleteRecord";
  record: ResourceKey;
}
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:51](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/graph.ts#L51)

Signals to the Graph that a resource has been deleted, so that
it can be removed from any relationships that reference it.

## Properties

### isNew

```ts
isNew: boolean;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:63](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/graph.ts#L63)

Whether the resource was a client-created resource that had not yet been persisted

***

### op

```ts
op: "deleteRecord";
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:55](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/graph.ts#L55)

The name of the operation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/graph.ts:59](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/graph.ts#L59)

The cache key for the resource that was deleted
