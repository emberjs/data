---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/experiments/pagination/functions/getPaginationState.md
description: >-
  Experimental: returns the pagination state for a request, creating it on first
  call and returning the same instance for the same request thereafter.
---

&#x20;

# &#x20;getPaginationState()&#x20;

```ts
function getPaginationState<RT, E>(request: Future<RT>, pageHints?: PageHints): PaginationState<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:744](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/pagination-state.ts#L744)

Get the [PaginationState](../types/PaginationState.md) for a given request. Returns the same instance
for the same request future, so that repeated calls (e.g. in a template, or
alongside the `<Paginate />` component using the same request) share the same
local pagination state. Keyed by request identity, just like
getRequestState.

```ts
const future = store.request(query);
const pages = getPaginationState(future);

await future;
pages.totalPages; // now known, if the response exposed it
await pages.loadNext();
```

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### request

`Future`<`RT`>

### pageHints?

[`PageHints`](../types/PageHints.md)

## Returns

[`PaginationState`](../types/PaginationState.md)<`RT`, `E`>
