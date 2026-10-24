---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/experiments/storage/functions/onStorageEvent.md
description: >-
  Experimental helper that subscribes to storage changes from both native
  `StorageEvent`s and `CacheStorage` notifications, returning an unsubscribe
  function.
---

&#x20;

# &#x20;onStorageEvent()

```ts
function onStorageEvent(listener: (event: EffectStorageEvent) => void): () => void;
```

Defined in: [warp-drive-packages/experiments/src/storage/storage.ts:140](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/experiments/src/storage/storage.ts#L140)

Subscribes to storage-change events, whether they originate from the
native Storage API (a `StorageEvent`, fired cross-tab) or from
[CacheStorage](../classes/CacheStorage.md)'s own same-tab notifications (dispatched as a
`CustomEvent` under the same 'storage' name — see `emitStorageEvent`
in `./cache.ts`).

Returns an unsubscribe function.

This can't be expressed by widening the global `WindowEventMap.storage`
type: that entry is inherited from `WindowEventHandlersEventMap` as
`StorageEvent`, and a declaration-merged override has to stay assignable
to the type it's overriding, not the other way around — deliberately
reusing this event name for a wider union has no way to satisfy that.

Route storage-event subscribers through this helper instead of calling
`window.addEventListener('storage', ...)` directly.

## Parameters

### listener

(`event`: [`EffectStorageEvent`](../types/EffectStorageEvent.md)) => `void`

## Returns

() => `void`
