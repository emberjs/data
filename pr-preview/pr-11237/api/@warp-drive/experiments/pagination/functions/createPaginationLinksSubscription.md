---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/experiments/pagination/functions/createPaginationLinksSubscription.md
description: >-
  Experimental: creates the subscription a pagination links component such as
  `<EachLink />` uses to derive navigation links from a paged pagination state.
---

&#x20;

# &#x20;createPaginationLinksSubscription()&#x20;

```ts
function createPaginationLinksSubscription<RT, E>(args: PaginationLinksSubscriptionArgs<RT, E>): PaginationLinksSubscription<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links-subscription.ts:85](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/signals/pagination-links-subscription.ts#L85)

Creates the [PaginationLinksSubscription](../types/PaginationLinksSubscription.md) a links component (such as
`<EachLink />`) uses to derive its links from a [PagedPaginationState](../types/PagedPaginationState.md).

```ts
const subscription = createPaginationLinksSubscription({ pages: paginationState });

subscription.paginationLinks; // the derived PaginationLinks
subscription[DISPOSE](); // tear down when the owning component unmounts
```

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### args

`PaginationLinksSubscriptionArgs`<`RT`, `E`>

## Returns

[`PaginationLinksSubscription`](../types/PaginationLinksSubscription.md)<`RT`, `E`>
