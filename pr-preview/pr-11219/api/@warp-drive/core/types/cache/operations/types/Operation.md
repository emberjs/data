---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/core/types/cache/operations/types/Operation.md
description: >-
  Union of the updates `cache.patch` applies to the cache's remote (clean)
  state, typically from server pushes such as WebSocket or SSE messages.
---

# &#x20;Operation

```ts
type Operation = 
  | MergeOperation
  | RemoveResourceOperation
  | RemoveDocumentOperation
  | AddResourceOperation
  | UpdateResourceOperation
  | UpdateResourceFieldOperation
  | UpdateResourceRelationshipOperation
  | AddToResourceRelationshipOperation
  | RemoveFromResourceRelationshipOperation
  | AddToDocumentOperation
  | RemoveFromDocumentOperation;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:303](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/types/cache/operations.ts#L303)

[Cache](../../types/Cache.md) Operations perform updates to the
Cache's "remote" (or clean) state to reflect external
changes.

Usually operations represent the result of a [WebSocket](https://developer.mozilla.org/docs/Web/API/WebSocket) or
[ServerEvent](https://developer.mozilla.org/docs/Web/API/EventSource) message, though they can also be used to carefully
patch the state of the cache with information known by the
application or developer.

Operations are applied via [Cache.patch](../../types/Cache.md#patch).

See also:

* [MergeOperation](MergeOperation.md)
* [RemoveResourceOperation](RemoveResourceOperation.md)
* [RemoveDocumentOperation](RemoveDocumentOperation.md)
* [AddResourceOperation](AddResourceOperation.md)
* [UpdateResourceOperation](UpdateResourceOperation.md)
* [UpdateResourceFieldOperation](UpdateResourceFieldOperation.md)
* [UpdateResourceRelationshipOperation](UpdateResourceRelationshipOperation.md)
* [AddToResourceRelationshipOperation](AddToResourceRelationshipOperation.md)
* [RemoveFromResourceRelationshipOperation](RemoveFromResourceRelationshipOperation.md)
* [AddToDocumentOperation](AddToDocumentOperation.md)
* [RemoveFromDocumentOperation](RemoveFromDocumentOperation.md)
