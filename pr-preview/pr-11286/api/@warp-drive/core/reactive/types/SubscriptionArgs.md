---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/reactive/types/SubscriptionArgs.md
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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:120](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L120)

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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:149](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L149)

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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:175](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L175)

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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:161](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L161)

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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:134](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L134)

A query to use for the request. This should be an object that can be
passed to `store.request`. Use this in place of `@request` if you would
like the component to also initiate the request.

***

### request?

```ts
optional request?: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:126](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/signals/request-subscription.ts#L126)

The request to monitor. This should be a `Future` instance returned
by either the `store.request` or `store.requestManager.request` methods.
