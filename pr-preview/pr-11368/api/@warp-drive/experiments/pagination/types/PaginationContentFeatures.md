---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/experiments/pagination/types/PaginationContentFeatures.md
description: >-
  Experimental: the combined paged and infinite content features a pagination
  subscription builds, before `<Paginate />` narrows them to one mode.
---

&#x20;

# &#x20;PaginationContentFeatures\<RT>

```ts
type PaginationContentFeatures<RT> = PagedPaginationContentFeatures<RT> & InfinitePaginationContentFeatures<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-subscription.ts:73](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/signals/pagination-subscription.ts#L73)

The full set of content features a [PaginationSubscription](PaginationSubscription.md) builds —
both modes' surfaces. The `<Paginate />` component narrows this to one mode
via [PaginationContentFeaturesFor](PaginationContentFeaturesFor.md) before yielding.

## Type Parameters

### RT

`RT`
