---
url: https://canary.warp-drive.io/api/@warp-drive/core/types/NotifyKeys.md
description: >-
  A set of field names passed to `notify` or `notifyChange` to report many
  `attributes` or `relationships` changes in one call.
---

# &#x20;NotifyKeys&#x20;

```ts
type NotifyKeys = Set<string>;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/notification-manager.ts:54](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/store/-private/managers/notification-manager.ts#L54)

The shape accepted by NotificationManager.notify and
CacheCapabilitiesManager.notifyChange for delivering many keys for
the `'attributes'` or `'relationships'` namespaces in a single call
instead of once per key.
