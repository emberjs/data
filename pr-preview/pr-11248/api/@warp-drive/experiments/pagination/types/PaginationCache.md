---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/experiments/pagination/types/PaginationCache.md
description: >-
  Experimental: the shared, app-wide store of loaded pages, page order, and
  `totalPages` for one paginated collection, keyed by its `first` or `self`
  link.
---

&#x20;

# &#x20;PaginationCache\<RT = `unknown`, E = `unknown`>&#x20;

```ts
interface PaginationCache<RT = unknown, E = unknown> {
  totalPages: number;
  get data(): Iterable<ContentItem<RT>>;
  get pages(): Iterable<Readonly<PageCache<RT, E>>>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:67](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/pagination-cache.ts#L67)

**`Hideconstructor`**

The global, shared cache for a paginated collection. Keyed by the collection's
`first` (or `self`) link, so that multiple components paging the same collection
share loaded pages, the page graph, and `totalPages`.

This holds only shared, request-agnostic data. Per-component state (the active
page, navigation) lives on [PaginationState](PaginationState.md), which is the API consumers
interact with — the cache itself is plumbing shared between the pagination
classes.

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

## Properties

### totalPages

```ts
totalPages: number;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:85](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/pagination-cache.ts#L85)

The total number of pages in the collection, or `0` when unknown. Consumers
should read this via [PaginationState.totalPages](PaginationState.md#totalpages).

### data

#### Get Signature

```ts
get data(): Iterable<ContentItem<RT>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:237](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/pagination-cache.ts#L237)

The items of every loaded page in the shared graph, flattened into one
contiguous iterable in page order. Pages that are known but not loaded
contribute nothing.

This is the whole-collection view. For the run a single component is
viewing, use [PaginationState.data](PaginationState.md#data).

##### Returns

[`Iterable`](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html#iterable-interface)<`ContentItem`<`RT`>>

***

### pages

#### Get Signature

```ts
get pages(): Iterable<Readonly<PageCache<RT, E>>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:215](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/pagination-cache.ts#L215)

Every page known to the shared graph, in order — loaded pages and pages
known only from links — across all components sharing the collection.

This is the whole-collection view. For the run a single component is
viewing, use [PaginationState.pages](PaginationState.md#pages).

```ts
const cache = getPaginationCache(firstLink);
for (const page of cache.pages) {
  // page.isLoaded, page.pageNumber, page.data, ...
}
```

##### Returns

[`Iterable`](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html#iterable-interface)<[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`PageCache`](PageCache.md)<`RT`, `E`>>>
