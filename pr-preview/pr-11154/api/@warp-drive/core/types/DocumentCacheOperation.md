---
url: /pr-preview/pr-11154/api/@warp-drive/core/types/DocumentCacheOperation.md
---

# &#x20;DocumentCacheOperation

```ts
type DocumentCacheOperation = "invalidated" | "added" | "removed" | "updated" | "state";
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:20](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L20)

The kinds of change notifications the [NotificationManager](../store/types/NotificationManager.md) can emit for a request document.
