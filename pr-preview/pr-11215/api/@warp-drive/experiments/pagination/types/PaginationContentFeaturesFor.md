---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/experiments/pagination/types/PaginationContentFeaturesFor.md
description: >-
  Experimental: resolves a pagination mode to the content features `<Paginate
  />` yields, the infinite set for `'infinite'` and the paged set otherwise.
---

&#x20;

# &#x20;PaginationContentFeaturesFor\<RT = `unknown`, M *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`>

```ts
type PaginationContentFeaturesFor<RT = unknown, M extends PaginateMode = "paged"> = M extends "infinite" ? InfinitePaginationContentFeatures<RT> : PagedPaginationContentFeatures<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:82](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/signals/pagination-subscription.ts#L82)

Resolves a [PaginateMode](PaginateMode.md) to the content features it exposes. Mirror of
[PaginationStateFor](PaginationStateFor.md).

## Type Parameters

### RT

`RT` = `unknown`

### M

`M` *extends* [`PaginateMode`](PaginateMode.md) = `"paged"`
