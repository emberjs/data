---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/api/@warp-drive/experiments/pagination/types/PaginationLink.md
description: >-
  Experimental: an entry in the numbered pagination links list, either a
  navigable numbered link or a placeholder for a gap, told apart by `isReal`.
---

&#x20;

# &#x20;PaginationLink

```ts
type PaginationLink = 
  | RealPaginationLink
  | PlaceholderPaginationLink;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-links.ts:211](https://github.com/warp-drive-data/warp-drive/blob/f56bb6126893009f05d6a7069d124e7a06b083c1/warp-drive-packages/core/src/signals/pagination-links.ts#L211)

A member of [PaginationLinks.links](PaginationLinks.md#links): either a numbered
[RealPaginationLink](RealPaginationLink.md) or a [PlaceholderPaginationLink](PlaceholderPaginationLink.md) standing in
for a gap. Discriminate with [isReal](RealPaginationLink.md#isreal):

```ts
for (const link of links.links) {
  if (link.isReal) {
    // numbered link: link.index, link.setActive
  } else {
    // gap: link.indexRange
  }
}
```
