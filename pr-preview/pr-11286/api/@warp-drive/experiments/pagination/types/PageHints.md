---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/experiments/pagination/types/PageHints.md
---

&#x20;

# &#x20;PageHints()&#x20;

```ts
interface PageHints {}
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:121](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L121)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:122](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L122)

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
