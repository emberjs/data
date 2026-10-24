---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/functions/getPaginationState.md
---

# &#x20;getPaginationState()&#x20;

```ts
function getPaginationState<RT, E>(request: Future<RT>, pageHints?: PageHints): PaginationState<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:641](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/pagination-state.ts#L641)

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

[`Future`](../../../request/types/Future.md)<`RT`>

### pageHints?

[`PageHints`](../types/PageHints.md)

## Returns

[`PaginationState`](../types/PaginationState.md)<`RT`, `E`>
