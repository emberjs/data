---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/experiments/pagination/functions/getPaginationLinks.md
---

&#x20;

# &#x20;getPaginationLinks()&#x20;

```ts
function getPaginationLinks<RT, E>(state: PagedPaginationState<RT, E>): Readonly<PaginationLinks<RT, E>>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:745](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L745)

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
