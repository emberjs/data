---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/experiments/pagination/types/PaginateMode.md
description: >-
  Experimental: the `@mode` value of `<Paginate />`, either `'paged'` for a
  single-page view or `'infinite'` for an accumulated view, which selects the
  yielded pagination API.
---

&#x20;

# &#x20;PaginateMode

```ts
type PaginateMode = "paged" | "infinite";
```

Defined in: [warp-drive-packages/core/src/signals/pagination-state.ts:22](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/pagination-state.ts#L22)

The two navigation surfaces a `<Paginate />` component can drive. Selecting
one (via the component's `@mode` arg) narrows the yielded state so the two
APIs cannot be mixed:

* `'paged'` — single-page view, see [PagedPaginationState](PagedPaginationState.md).
* `'infinite'` — accumulated view, see [InfinitePaginationState](InfinitePaginationState.md).
