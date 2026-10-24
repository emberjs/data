---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/ContentFeatures.md
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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:65](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L65)

Utilities for keeping the request fresh

## Type Parameters

### RT

`RT`

## Properties

### abort?

```ts
optional abort?: () => void;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:89](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L89)

Aborts the in-flight refresh/reload request, if any.

#### Returns

`void`

***

### isHidden

```ts
isHidden: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:73](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L73)

Whether the browser reports that the tab is hidden.

***

### isOnline

```ts
isOnline: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:69](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L69)

Whether the browser reports that the network is online.

***

### isRefreshing

```ts
isRefreshing: boolean;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:77](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L77)

Whether the subscription is currently refreshing the request.

***

### latestRequest?

```ts
optional latestRequest?: Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:93](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L93)

The most recent refresh/reload request that was made, if any.

***

### refresh

```ts
refresh: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:81](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L81)

Refreshes the request, updating it in the background.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>

***

### reload

```ts
reload: () => Promise<void>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:85](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/request-subscription.ts#L85)

Retries the request, reloading it from the server.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
