---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/cache/operations/types/Op.md
---

# &#x20;Op

```ts
interface Op {
  op: string;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:30](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L30)

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

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:34](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L34)

The name of the operation
