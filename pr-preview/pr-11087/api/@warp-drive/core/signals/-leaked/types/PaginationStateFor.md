---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/types/PaginationStateFor.md
---

# &#x20;PaginationStateFor\<RT = `unknown`, E = `unknown`, M *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`>

```ts
type PaginationStateFor<RT = unknown, E = unknown, M extends PaginateMode = "paged"> = M extends "infinite" ? InfinitePaginationState<RT, E> : PagedPaginationState<RT, E>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:81](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-state.ts#L81)

Resolves a [PaginateMode](PaginateMode.md) to the surface it exposes, so a component
generic over the mode can yield only that surface.

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

### M

`M` *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`
