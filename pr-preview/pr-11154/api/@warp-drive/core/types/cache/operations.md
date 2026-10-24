---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/cache/operations.md
---

[Cache](../types/Cache.md) Operations perform updates to the
Cache's "remote" (or clean) state to reflect external
changes.

Usually operations represent the result of a [WebSocket](https://developer.mozilla.org/docs/Web/API/WebSocket) or
[ServerEvent](https://developer.mozilla.org/docs/Web/API/EventSource) message, though they can also be used to carefully
patch the state of the cache with information known by the
application or developer.

Operations are applied via [Cache.patch](../types/Cache.md#patch).

See also Mutation, which applies analogous updates to the
Cache's "local" (or dirty) state.

## Types

* [AddResourceOperation](types/AddResourceOperation.md)
* [AddToDocumentOperation](types/AddToDocumentOperation.md)
* [AddToResourceRelationshipOperation](types/AddToResourceRelationshipOperation.md)
* [MergeOperation](types/MergeOperation.md)
* [Op](types/Op.md)
* [RemoveDocumentOperation](types/RemoveDocumentOperation.md)
* [RemoveFromDocumentOperation](types/RemoveFromDocumentOperation.md)
* [RemoveFromResourceRelationshipOperation](types/RemoveFromResourceRelationshipOperation.md)
* [RemoveResourceOperation](types/RemoveResourceOperation.md)
* [UpdateResourceFieldOperation](types/UpdateResourceFieldOperation.md)
* [UpdateResourceOperation](types/UpdateResourceOperation.md)
* [UpdateResourceRelationshipOperation](types/UpdateResourceRelationshipOperation.md)
* [Operation](types/Operation.md)
