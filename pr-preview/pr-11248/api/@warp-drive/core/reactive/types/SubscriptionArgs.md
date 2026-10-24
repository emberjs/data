---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/reactive/types/SubscriptionArgs.md
description: >-
  Options for a request subscription: the request or query to monitor and its
  autorefresh settings.
---

# &#x20;SubscriptionArgs\<RT, E>

```ts
interface SubscriptionArgs<RT, E> {
  autorefresh?: AutorefreshBehaviorCombos;
  autorefreshBehavior?: "reload" | "refresh" | "policy";
  autorefreshThreshold?: number;
  query?: StoreRequestInput<RT> | null;
  request?: Future<RT> | null;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:137](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-subscription.ts#L137)

The args accepted by a [RequestSubscription](RequestSubscription.md).

## Extended by

* [`RequestArgs`](RequestArgs.md)

## Type Parameters

### RT

`RT`

### E

`E`

## Properties

### autorefresh?

```ts
optional autorefresh?: AutorefreshBehaviorCombos;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:166](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-subscription.ts#L166)

The autorefresh behavior for the request. This can be a boolean, or any
combination of the following values: `'online'`, `'interval'`, `'invalid'`.

* `'online'`: Refresh the request when the browser comes back online
* `'interval'`: Refresh the request at a specified interval
* `'invalid'`: Refresh the request when the store emits an invalidation

If `true`, this is equivalent to `'online,invalid'`.

Defaults to `false`.

***

### autorefreshBehavior?

```ts
optional autorefreshBehavior?: "reload" | "refresh" | "policy";
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:192](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-subscription.ts#L192)

The behavior of the request initiated by autorefresh. This can be one of
the following values:

* `'refresh'`: Refresh the request in the background
* `'reload'`: Force a reload of the request
* `'policy'` (**default**): Let the store's configured CachePolicy decide whether to
  reload, refresh, or do nothing.

Defaults to `'policy'`.

***

### autorefreshThreshold?

```ts
optional autorefreshThreshold?: number;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:178](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-subscription.ts#L178)

The number of milliseconds to wait before refreshing the request when the
browser comes back online or the network becomes available.

This also controls the interval at which the request will be refreshed if
the `interval` autorefresh type is enabled.

Defaults to `30_000` (30 seconds).

***

### query?

```ts
optional query?: StoreRequestInput<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:151](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-subscription.ts#L151)

A query to use for the request. This should be an object that can be
passed to `store.request`. Use this in place of `@request` if you would
like the component to also initiate the request.

***

### request?

```ts
optional request?: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:143](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-subscription.ts#L143)

The request to monitor. This should be a `Future` instance returned
by either the `store.request` or `store.requestManager.request` methods.
