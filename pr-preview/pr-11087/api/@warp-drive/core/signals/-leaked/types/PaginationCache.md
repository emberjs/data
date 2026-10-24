---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/signals/-leaked/types/PaginationCache.md
---

# &#x20;PaginationCache\<RT = `unknown`, E = `unknown`>&#x20;

```ts
interface PaginationCache<RT = unknown, E = unknown> {
  totalPages: number;
  get data(): Iterable<ContentItem<RT>>;
  get pages(): Iterable<Readonly<PageCache<RT, E>>>;
}
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:61](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-cache.ts#L61)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:79](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-cache.ts#L79)

The total number of pages in the collection, or `0` when unknown. Consumers
should read this via [PaginationState.totalPages](PaginationState.md#totalpages).

### data

#### Get Signature

```ts
get data(): Iterable<ContentItem<RT>>;
```

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:223](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-cache.ts#L223)

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

Defined in: [warp-drive-packages/core/src/signals/pagination-cache.ts:200](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/pagination-cache.ts#L200)

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
