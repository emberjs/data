---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/types/cache/operations/types/Op.md
description: Base shape of every cache operation, carrying the operation's name in `op`.
---

# &#x20;Op

```ts
interface Op {
  op: string;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:34](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/cache/operations.ts#L34)

All operations are objects with at least one property,
`op` which contains a string with the name of the operation
to perform.

## Extended by

* [`MergeOperation`](MergeOperation.md)
* [`RemoveDocumentOperation`](RemoveDocumentOperation.md)
* [`RemoveResourceOperation`](RemoveResourceOperation.md)
* [`AddResourceOperation`](AddResourceOperation.md)
* [`UpdateResourceOperation`](UpdateResourceOperation.md)
* [`UpdateResourceFieldOperation`](UpdateResourceFieldOperation.md)
* [`UpdateResourceRelationshipOperation`](UpdateResourceRelationshipOperation.md)
* [`AddToDocumentOperation`](AddToDocumentOperation.md)
* [`AddToResourceRelationshipOperation`](AddToResourceRelationshipOperation.md)
* [`RemoveFromResourceRelationshipOperation`](RemoveFromResourceRelationshipOperation.md)
* [`RemoveFromDocumentOperation`](RemoveFromDocumentOperation.md)

## Properties

### op

```ts
op: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:38](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/cache/operations.ts#L38)

The name of the operation
