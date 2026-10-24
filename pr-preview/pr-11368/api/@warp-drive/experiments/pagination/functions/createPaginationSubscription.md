---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/experiments/pagination/functions/createPaginationSubscription.md
description: >-
  Experimental: creates the subscription that manages a `<Paginate />`
  component's initial request lifecycle and pagination state, for managing that
  lifecycle yourself.
---

&#x20;

# &#x20;createPaginationSubscription()&#x20;

```ts
function createPaginationSubscription<RT, E>(store: Store$1 | RequestManager, args: PaginationSubscriptionArgs<RT, E>): PaginationSubscription<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:428](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/signals/pagination-subscription.ts#L428)

Creates the [PaginationSubscription](../types/PaginationSubscription.md) a `<Paginate />` component uses to
manage its request lifecycle and pagination state. Pass the result back into
the component via `@subscription` to manage the lifecycle externally.

```ts
const subscription = createPaginationSubscription(store, { request });

subscription.paginationState; // the per-component PaginationState
subscription[DISPOSE](); // tear down when the owning component unmounts
```

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### store

`Store$1` | [`RequestManager`](../../../core/classes/RequestManager.md)

### args

`PaginationSubscriptionArgs`<`RT`, `E`>

## Returns

[`PaginationSubscription`](../types/PaginationSubscription.md)<`RT`, `E`>
