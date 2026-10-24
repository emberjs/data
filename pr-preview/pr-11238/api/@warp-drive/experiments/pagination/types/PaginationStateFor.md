---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/experiments/pagination/types/PaginationStateFor.md
description: >-
  Experimental: resolves a pagination mode to its state type, the infinite-mode
  state for `'infinite'` and the paged-mode state otherwise.
---

&#x20;

# &#x20;PaginationStateFor\<RT = `unknown`, E = `unknown`, M *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`>

```ts
type PaginationStateFor<RT = unknown, E = unknown, M extends PaginateMode = "paged"> = M extends "infinite" ? InfinitePaginationState<RT, E> : PagedPaginationState<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:96](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/core/src/signals/pagination-state.ts#L96)

Resolves a [PaginateMode](PaginateMode.md) to the surface it exposes, so a component
generic over the mode can yield only that surface.

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

### M

`M` *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`
