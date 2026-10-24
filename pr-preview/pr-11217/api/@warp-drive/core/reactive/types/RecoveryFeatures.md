---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/reactive/types/RecoveryFeatures.md
description: >-
  The online and visibility state plus a `retry` function that a request
  subscription exposes for recovering from a failed request.
---

# &#x20;RecoveryFeatures

```ts
interface RecoveryFeatures {
  isHidden: boolean;
  isOnline: boolean;
  retry: () => Promise<void>;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:53](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-subscription.ts#L53)

Utilities to assist in recovering from the error.

## Properties

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:61](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-subscription.ts#L61)

Whether the browser reports that the tab is hidden.

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:57](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-subscription.ts#L57)

Whether the browser reports that the network is online.

***

### retry

```ts
retry: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:65](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-subscription.ts#L65)

Retries the request, reloading it from the server.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
