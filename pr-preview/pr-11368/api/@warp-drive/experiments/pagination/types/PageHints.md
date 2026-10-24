---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/experiments/pagination/types/PageHints.md
description: >-
  Experimental: a function you pass to `<Paginate />` that reads `currentPage`
  and `totalPages` from a loaded document when they are not in the default
  `meta` locations.
---

&#x20;

# &#x20;PageHints()&#x20;

```ts
interface PageHints {}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:31](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/signals/pagination-cache.ts#L31)

A hint function for extracting the `currentPage` and `totalPages` from a loaded
document, for when the response does not expose these values through the
default `meta` locations. Provided by the consumer via `<Paginate />`'s
`@pageHints` arg:

```gts
<Paginate @pageHints={{...}} />
```

Since these values are attached to the shared [PaginationCache](PaginationCache.md), the hint is
a property of the *collection*, not the component. Every `<Paginate />` sharing a
collection must provide the same function reference — define it once at module
scope and import it everywhere.

```ts
PageHints(document: ReactiveDocument<unknown>): {
  currentPage: number;
  totalPages: number;
};
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:32](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/signals/pagination-cache.ts#L32)

A hint function for extracting the `currentPage` and `totalPages` from a loaded
document, for when the response does not expose these values through the
default `meta` locations. Provided by the consumer via `<Paginate />`'s
`@pageHints` arg:

```gts
<Paginate @pageHints={{...}} />
```

Since these values are attached to the shared [PaginationCache](PaginationCache.md), the hint is
a property of the *collection*, not the component. Every `<Paginate />` sharing a
collection must provide the same function reference — define it once at module
scope and import it everywhere.

## Parameters

### document

`ReactiveDocument`<`unknown`>

## Returns

```ts
{
  currentPage: number;
  totalPages: number;
}
```

### currentPage

```ts
currentPage: number;
```

### totalPages

```ts
totalPages: number;
```
