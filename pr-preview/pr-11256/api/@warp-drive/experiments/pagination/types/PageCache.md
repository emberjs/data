---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/experiments/pagination/types/PageCache.md
description: >-
  Experimental: one page of a paginated collection, exposing its request,
  loading and error status, data, and links to neighboring pages.
---

&#x20;

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
  get reason(): StructuredErrorDocument<E> | null;
  get value(): RT | null;
}
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:71](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L71)

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

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:95](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L95)

The `first` link of the collection, when the response exposed one.

***

### lastLink

```ts
lastLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:98](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L98)

The `last` link of the collection, when the response exposed one.

***

### nextLink

```ts
nextLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:92](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L92)

The `next` link of this page, or `null` at the end of the collection.

***

### pageNumber

```ts
pageNumber: number;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:105](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L105)

The 1-based page number, or `0` when unknown (for example cursor-based
pagination, where pages have no ordinal position). Derived from the
collection's [PageHints](PageHints.md).

***

### prevLink

```ts
prevLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:89](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L89)

The `prev` link of this page, or `null` at the start of the collection.

***

### request

```ts
request: Future<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:80](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L80)

The request that loaded (or is loading) this page, or `null` if the page is
known from links but was never requested. Wrap it in a `<Request>` component
to render the page's loading, error, and content states.

***

### selfLink

```ts
selfLink: string | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:86](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L86)

The `self` link of this page — the URL that identifies it in the collection.

### data

#### Get Signature

```ts
get data(): ContentData<RT> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:132](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L132)

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

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:197](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L197)

The first page of the collection, when the response exposed a `first` link.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### isCancelled

#### Get Signature

```ts
get isCancelled(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:165](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L165)

Whether this page's request was cancelled (aborted).

##### Returns

`boolean`

***

### isError

#### Get Signature

```ts
get isError(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:171](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L171)

Whether this page's request rejected with an error.

##### Returns

`boolean`

***

### isLoaded

#### Get Signature

```ts
get isLoaded(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:147](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L147)

Whether this page's request has settled (successfully or with an error).

##### Returns

`boolean`

***

### isLoading

#### Get Signature

```ts
get isLoading(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:153](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L153)

Whether this page's request is currently in flight.

##### Returns

`boolean`

***

### isRequested

#### Get Signature

```ts
get isRequested(): boolean;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:141](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L141)

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

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:159](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L159)

Whether this page's request resolved successfully.

##### Returns

`boolean`

***

### last

#### Get Signature

```ts
get last(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:204](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L204)

The last page of the collection, when the response exposed a `last` link.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### next

#### Get Signature

```ts
get next(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:190](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L190)

The page at this page's `next` link, or `null` at the end of the collection.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### prev

#### Get Signature

```ts
get prev(): PageCache<RT, E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:183](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L183)

The page at this page's `prev` link, or `null` at the start of the collection.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### reason

#### Get Signature

```ts
get reason(): StructuredErrorDocument<E> | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:177](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L177)

The error this page's request rejected with, or `null` if it did not reject.

##### Returns

`StructuredErrorDocument`<`E`> | `null`

***

### value

#### Get Signature

```ts
get value(): RT | null;
```

Defined in: [warp-drive-packages/core/src/signals/page-cache.ts:123](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/signals/page-cache.ts#L123)

The document this page's request resolved to, or `null` while it has not
resolved.

##### Returns

`RT` | `null`
