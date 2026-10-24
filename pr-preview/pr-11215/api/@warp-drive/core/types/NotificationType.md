---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/NotificationType.md
description: >-
  Every notification kind a resource subscriber can receive, from lifecycle
  operations to `attributes`, `relationships`, `errors`, `meta`, and `identity`
  changes.
---

# &#x20;NotificationType

```ts
type NotificationType = 
  | "attributes"
  | "relationships"
  | "identity"
  | "errors"
  | "meta"
  | CacheOperation;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:41](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L41)

The full set of notification kinds the [NotificationManager](../store/types/NotificationManager.md) can emit for a resource,
including both [CacheOperation](CacheOperation.md)s and finer-grained field-level change notifications.
