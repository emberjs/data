---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/reactive/functions/createRequestSubscription.md
description: >-
  Creates a reactive subscription to a request or query that tracks its state
  and handles autorefresh, retry, and refresh.
---

# &#x20;createRequestSubscription()

```ts
function createRequestSubscription<RT, E>(store: 
  | Store
| RequestManager, args: SubscriptionArgs<RT, E>): RequestSubscription<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:848](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/request-subscription.ts#L848)

Creates a [RequestSubscription](../types/RequestSubscription.md), the reactive class powering the
`<Request />` component's autorefresh, retry, and refresh behaviors.

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### store

| [`Store`](../../classes/Store.md)
| [`RequestManager`](../../classes/RequestManager.md)

### args

[`SubscriptionArgs`](../types/SubscriptionArgs.md)<`RT`, `E`>

## Returns

[`RequestSubscription`](../types/RequestSubscription.md)<`RT`, `E`>
