---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/reactive/types/ContentFeatures.md
description: >-
  The online, visibility, and refreshing state plus `refresh`, `reload`, and
  `abort` functions a request subscription exposes alongside successful content.
---

# &#x20;ContentFeatures\<RT>

```ts
interface ContentFeatures<RT> {
  abort?: () => void;
  isHidden: boolean;
  isOnline: boolean;
  isRefreshing: boolean;
  latestRequest?: Future<RT>;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:77](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L77)

Utilities for keeping the request fresh

## Type Parameters

### RT

`RT`

## Properties

### abort?

```ts
optional abort?: () => void;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:101](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L101)

Aborts the in-flight refresh/reload request, if any.

#### Returns

`void`

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:85](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L85)

Whether the browser reports that the tab is hidden.

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:81](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L81)

Whether the browser reports that the network is online.

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:89](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L89)

Whether the subscription is currently refreshing the request.

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:105](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L105)

The most recent refresh/reload request that was made, if any.

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:93](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L93)

Refreshes the request, updating it in the background.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:97](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/request-subscription.ts#L97)

Retries the request, reloading it from the server.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
