---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/DocumentCacheOperation.md
description: >-
  The notification kinds sent to request document subscribers, such as `updated`
  or `invalidated`.
---

# &#x20;DocumentCacheOperation

```ts
type DocumentCacheOperation = "invalidated" | "added" | "removed" | "updated" | "state";
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:26](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L26)

The kinds of change notifications the [NotificationManager](../store/types/NotificationManager.md) can emit for a request document.
