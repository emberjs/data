---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/experiments/pagination/variables/defaultPageHints.md
description: >-
  Experimental: the fallback page-hints function, reading `meta.page` or
  `meta.currentPage` and `meta.totalPages` from a document, with `0` meaning
  unknown.
---

&#x20;

# &#x20;defaultPageHints&#x20;

```ts
const defaultPageHints: PageHints;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:45](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/pagination-cache.ts#L45)

The default [PageHints](../types/PageHints.md). Reads `currentPage`/`page` and `totalPages` from the
document `meta`, matching the behavior used before `pageHints` was configurable.
Used whenever the consumer does not provide a `pageHints` function.
