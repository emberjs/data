---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/experiments/pagination/types/PaginateArgs.md
---

&#x20;

# &#x20;PaginateArgs\<RT, E>

```ts
interface PaginateArgs<RT, E> extends PaginationSubscriptionArgs<RT, E> {
  autorefresh?: AutorefreshBehaviorCombos;
  autorefreshBehavior?: "reload" | "refresh" | "policy";
  autorefreshThreshold?: number;
  mode?: PaginateMode;
  pageHints?: PageHints;
  query?: StoreRequestInput<RT> | null;
  request?: Future<RT> | null;
  store?: Store$1 | RequestManager;
  subscription?: PaginationSubscription<RT, E>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:95](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-subscription.ts#L95)

## Extends

* `PaginationSubscriptionArgs`<`RT`, `E`>

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

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:166](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/request-subscription.ts#L166)

The autorefresh behavior for the request. This can be a boolean, or any
combination of the following values: `'online'`, `'interval'`, `'invalid'`.

* `'online'`: Refresh the request when the browser comes back online
* `'interval'`: Refresh the request at a specified interval
* `'invalid'`: Refresh the request when the store emits an invalidation

If `true`, this is equivalent to `'online,invalid'`.

Defaults to `false`.

#### Inherited from

```ts
PaginationSubscriptionArgs.autorefresh
```

***

### autorefreshBehavior?

```ts
optional autorefreshBehavior?: "reload" | "refresh" | "policy";
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:192](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/request-subscription.ts#L192)

The behavior of the request initiated by autorefresh. This can be one of
the following values:

* `'refresh'`: Refresh the request in the background
* `'reload'`: Force a reload of the request
* `'policy'` (**default**): Let the store's configured CachePolicy decide whether to
  reload, refresh, or do nothing.

Defaults to `'policy'`.

#### Inherited from

```ts
PaginationSubscriptionArgs.autorefreshBehavior
```

***

### autorefreshThreshold?

```ts
optional autorefreshThreshold?: number;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:178](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/request-subscription.ts#L178)

The number of milliseconds to wait before refreshing the request when the
browser comes back online or the network becomes available.

This also controls the interval at which the request will be refreshed if
the `interval` autorefresh type is enabled.

Defaults to `30_000` (30 seconds).

#### Inherited from

```ts
PaginationSubscriptionArgs.autorefreshThreshold
```

***

### mode?

```ts
optional mode?: PaginateMode;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:101](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-subscription.ts#L101)

Which navigation surface the component yields: `'paged'` (the default) or
`'infinite'`. Type-only — it narrows the yielded state and features so the
two surfaces cannot be mixed, and is never read at runtime.

***

### pageHints?

```ts
optional pageHints?: PageHints;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:92](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-subscription.ts#L92)

A function to extract the `currentPage` and `totalPages` from a loaded document
when they are not available in the default `meta` locations. Must be the same
reference across all `<Paginate />` components sharing a collection.

#### Inherited from

```ts
PaginationSubscriptionArgs.pageHints
```

***

### query?

```ts
optional query?: StoreRequestInput<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:151](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/request-subscription.ts#L151)

A query to use for the request. This should be an object that can be
passed to `store.request`. Use this in place of `@request` if you would
like the component to also initiate the request.

#### Inherited from

```ts
PaginationSubscriptionArgs.query
```

***

### request?

```ts
optional request?: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:143](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/request-subscription.ts#L143)

The request to monitor. This should be a `Future` instance returned
by either the `store.request` or `store.requestManager.request` methods.

#### Inherited from

```ts
PaginationSubscriptionArgs.request
```

***

### store?

```ts
optional store?: Store$1 | RequestManager;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:113](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-subscription.ts#L113)

The store instance to use for making requests. If contexts are available,
the component will default to using the `store` on the context.

This is required if the store is not available via context or should be
different from the store provided via context.

***

### subscription?

```ts
optional subscription?: PaginationSubscription<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:103](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-subscription.ts#L103)
