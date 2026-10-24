---
url: /pr-preview/pr-11154/api/@warp-drive/core/signals/-leaked/types/PageCache.md
---

# &#x20;PageCache\<RT = `unknown`, E = `unknown`>&#x20;

```ts
interface PageCache<RT = unknown, E = unknown> {
  firstLink: string | null;
  lastLink: string | null;
  nextLink: string | null;
  pageNumber: number;
  prevLink: string | null;
  request: Future<RT> | null;
  selfLink: string | null;
  get data(): ContentData<RT> | null;
  get first(): PageCache<RT, E> | null;
  get isCancelled(): boolean;
  get isError(): boolean;
  get isLoaded(): boolean;
  get isLoading(): boolean;
  get isRequested(): boolean;
  get isSuccess(): boolean;
  get last(): PageCache<RT, E> | null;
  get next(): PageCache<RT, E> | null;
  get prev(): PageCache<RT, E> | null;
  get reason(): 
  | StructuredErrorDocument<E>
  | null;
  get value(): RT | null;
}
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:69](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L69)

**`Hideconstructor`**

A single page of a paginated collection: its request, its loaded document, and
its links to neighboring pages in the shared page graph.

Pages are yielded to consumers as `Readonly<PageCache>` — through
[PaginationState.activePage](PaginationState.md#activepage), [PaginationState.pages](PaginationState.md#pages), and the
relational getters below — to read a page's data and request status when
building pagination UIs:

```ts
const page = paginationState.activePage;

if (page?.isLoading) {
  // show a spinner
} else if (page?.isError) {
  // show page.reason
} else {
  // render page.data
}
```

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

## Properties

### firstLink

```ts
firstLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:93](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L93)

The `first` link of the collection, when the response exposed one.

***

### lastLink

```ts
lastLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:96](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L96)

The `last` link of the collection, when the response exposed one.

***

### nextLink

```ts
nextLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:90](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L90)

The `next` link of this page, or `null` at the end of the collection.

***

### pageNumber

```ts
pageNumber: number;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:103](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L103)

The 1-based page number, or `0` when unknown (for example cursor-based
pagination, where pages have no ordinal position). Derived from the
collection's [PageHints](PageHints.md).

***

### prevLink

```ts
prevLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:87](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L87)

The `prev` link of this page, or `null` at the start of the collection.

***

### request

```ts
request: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:78](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L78)

The request that loaded (or is loading) this page, or `null` if the page is
known from links but was never requested. Wrap it in a `<Request>` component
to render the page's loading, error, and content states.

***

### selfLink

```ts
selfLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:84](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L84)

The `self` link of this page — the URL that identifies it in the collection.

### data

#### Get Signature

```ts
get data(): ContentData<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:130](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L130)

The `data` member of the loaded document — the page's items — or `null`
while the page has not loaded.

##### Returns

`ContentData`<`RT`> | `null`

***

### first

#### Get Signature

```ts
get first(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:195](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L195)

The first page of the collection, when the response exposed a `first` link.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### isCancelled

#### Get Signature

```ts
get isCancelled(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:163](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L163)

Whether this page's request was cancelled (aborted).

##### Returns

`boolean`

***

### isError

#### Get Signature

```ts
get isError(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:169](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L169)

Whether this page's request rejected with an error.

##### Returns

`boolean`

***

### isLoaded

#### Get Signature

```ts
get isLoaded(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:145](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L145)

Whether this page's request has settled (successfully or with an error).

##### Returns

`boolean`

***

### isLoading

#### Get Signature

```ts
get isLoading(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:151](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L151)

Whether this page's request is currently in flight.

##### Returns

`boolean`

***

### isRequested

#### Get Signature

```ts
get isRequested(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:139](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L139)

Whether a request has ever been issued for this page. `false` for pages that
are known only from links.

##### Returns

`boolean`

***

### isSuccess

#### Get Signature

```ts
get isSuccess(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:157](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L157)

Whether this page's request resolved successfully.

##### Returns

`boolean`

***

### last

#### Get Signature

```ts
get last(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:202](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L202)

The last page of the collection, when the response exposed a `last` link.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### next

#### Get Signature

```ts
get next(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:188](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L188)

The page at this page's `next` link, or `null` at the end of the collection.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### prev

#### Get Signature

```ts
get prev(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:181](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L181)

The page at this page's `prev` link, or `null` at the start of the collection.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### reason

#### Get Signature

```ts
get reason(): 
  | StructuredErrorDocument<E>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:175](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L175)

The error this page's request rejected with, or `null` if it did not reject.

##### Returns

| [`StructuredErrorDocument`](../../../types/request/types/StructuredErrorDocument.md)<`E`>
| `null`

***

### value

#### Get Signature

```ts
get value(): RT | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:121](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/signals/page-cache.ts#L121)

The document this page's request resolved to, or `null` while it has not
resolved.

##### Returns

`RT` | `null`
