---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/experiments/pagination/types/PaginationStateFor.md
description: >-
  Experimental: resolves a pagination mode to its state type, the infinite-mode
  state for `'infinite'` and the paged-mode state otherwise.
---

&#x20;

# &#x20;PaginationStateFor\<RT = `unknown`, E = `unknown`, M *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`>

```ts
type PaginationStateFor<RT = unknown, E = unknown, M extends PaginateMode = "paged"> = M extends "infinite" ? InfinitePaginationState<RT, E> : PagedPaginationState<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:96](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/signals/pagination-state.ts#L96)

Resolves a [PaginateMode](PaginateMode.md) to the surface it exposes, so a component
generic over the mode can yield only that surface.

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

### M

`M` *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`
