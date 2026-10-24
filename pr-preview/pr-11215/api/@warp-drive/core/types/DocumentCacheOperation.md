---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/DocumentCacheOperation.md
description: >-
  The notification kinds sent to request document subscribers, such as `updated`
  or `invalidated`.
---

# &#x20;DocumentCacheOperation

```ts
type DocumentCacheOperation = "invalidated" | "added" | "removed" | "updated" | "state";
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:26](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L26)

The kinds of change notifications the [NotificationManager](../store/types/NotificationManager.md) can emit for a request document.
