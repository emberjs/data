---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/functions/createPaginationLinksSubscription.md
---

# &#x20;createPaginationLinksSubscription()&#x20;

```ts
function createPaginationLinksSubscription<RT, E>(args: PaginationLinksSubscriptionArgs<RT, E>): PaginationLinksSubscription<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links-subscription.ts:81](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-links-subscription.ts#L81)

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
