---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/experiments/pagination/functions/getPaginationLinks.md
description: >-
  Experimental: returns the navigation links for a paged pagination state,
  creating them on first call and returning the same instance for the same
  state.
---

&#x20;

# &#x20;getPaginationLinks()&#x20;

```ts
function getPaginationLinks<RT, E>(state: PagedPaginationState<RT, E>): Readonly<PaginationLinks<RT, E>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:385](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/signals/pagination-links.ts#L385)

Get the [PaginationLinks](../types/PaginationLinks.md) for a given [PaginationState](../types/PaginationState.md). Returns
the same instance for the same state, so repeated calls (for example a
`<Paginate />` component and a separate links component reading the same state)
share one set of links. Keyed by state identity, the same way
[getPaginationState](getPaginationState.md) is keyed by request and getRequestState by
future.

```ts
const links = getPaginationLinks(paginationState);

for (const link of links.links) {
  if (link.isReal) {
    // render a numbered link, using link.setActive as the click handler
  } else {
    // render an ellipsis for the gap link.indexRange covers
  }
}
```

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### state

[`PagedPaginationState`](../types/PagedPaginationState.md)<`RT`, `E`>

## Returns

[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`PaginationLinks`](../types/PaginationLinks.md)<`RT`, `E`>>
