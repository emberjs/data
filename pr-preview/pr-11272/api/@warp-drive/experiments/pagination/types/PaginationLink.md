---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/experiments/pagination/types/PaginationLink.md
---

&#x20;

# &#x20;PaginationLink

```ts
type PaginationLink = 
  | RealPaginationLink
  | PlaceholderPaginationLink;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:654](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L654)

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
