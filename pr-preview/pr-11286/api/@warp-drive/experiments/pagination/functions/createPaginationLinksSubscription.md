---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/experiments/pagination/functions/createPaginationLinksSubscription.md
---

&#x20;

# &#x20;createPaginationLinksSubscription()&#x20;

```ts
function createPaginationLinksSubscription<RT, E>(args: PaginationLinksSubscriptionArgs<RT, E>): PaginationLinksSubscription<RT, E>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:998](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L998)

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
