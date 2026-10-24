---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/experiments/pagination/functions/getPaginationState.md
---

&#x20;

# &#x20;getPaginationState()&#x20;

```ts
function getPaginationState<RT, E>(request: Future<RT>, pageHints?: PageHints): PaginationState<RT, E>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:518](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L518)

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
