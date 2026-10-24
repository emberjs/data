---
url: /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/types/PageHints.md
---

# &#x20;PageHints()&#x20;

```ts
interface PageHints {}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:29](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-cache.ts#L29)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:30](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-cache.ts#L30)

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

[`ReactiveDocument`](../../../reactive/types/ReactiveDocument.md)<`unknown`>

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
