---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/experiments/pagination/types/PageCache.md
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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:41](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L41)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:55](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L55)

The `first` link of the collection, when the response exposed one.

***

### lastLink

```ts
lastLink: string | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:57](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L57)

The `last` link of the collection, when the response exposed one.

***

### nextLink

```ts
nextLink: string | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:53](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L53)

The `next` link of this page, or `null` at the end of the collection.

***

### pageNumber

```ts
pageNumber: number;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:63](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L63)

The 1-based page number, or `0` when unknown (for example cursor-based
pagination, where pages have no ordinal position). Derived from the
collection's [PageHints](PageHints.md).

***

### prevLink

```ts
prevLink: string | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:51](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L51)

The `prev` link of this page, or `null` at the start of the collection.

***

### request

```ts
request: Future<RT> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:47](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L47)

The request that loaded (or is loading) this page, or `null` if the page is
known from links but was never requested. Wrap it in a `<Request>` component
to render the page's loading, error, and content states.

***

### selfLink

```ts
selfLink: string | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:49](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L49)

The `self` link of this page — the URL that identifies it in the collection.

### data

#### Get Signature

```ts
get data(): ContentData<RT> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:74](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L74)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:97](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L97)

The first page of the collection, when the response exposed a `first` link.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### isCancelled

#### Get Signature

```ts
get isCancelled(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:87](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L87)

Whether this page's request was cancelled (aborted).

##### Returns

`boolean`

***

### isError

#### Get Signature

```ts
get isError(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:89](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L89)

Whether this page's request rejected with an error.

##### Returns

`boolean`

***

### isLoaded

#### Get Signature

```ts
get isLoaded(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:81](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L81)

Whether this page's request has settled (successfully or with an error).

##### Returns

`boolean`

***

### isLoading

#### Get Signature

```ts
get isLoading(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:83](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L83)

Whether this page's request is currently in flight.

##### Returns

`boolean`

***

### isRequested

#### Get Signature

```ts
get isRequested(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:79](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L79)

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

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:85](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L85)

Whether this page's request resolved successfully.

##### Returns

`boolean`

***

### last

#### Get Signature

```ts
get last(): PageCache<RT, E> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:99](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L99)

The last page of the collection, when the response exposed a `last` link.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### next

#### Get Signature

```ts
get next(): PageCache<RT, E> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:95](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L95)

The page at this page's `next` link, or `null` at the end of the collection.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### prev

#### Get Signature

```ts
get prev(): PageCache<RT, E> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:93](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L93)

The page at this page's `prev` link, or `null` at the start of the collection.

##### Returns

`PageCache`<`RT`, `E`> | `null`

***

### reason

#### Get Signature

```ts
get reason(): StructuredErrorDocument<E> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:91](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L91)

The error this page's request rejected with, or `null` if it did not reject.

##### Returns

`StructuredErrorDocument`<`E`> | `null`

***

### value

#### Get Signature

```ts
get value(): RT | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:69](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L69)

The document this page's request resolved to, or `null` while it has not
resolved.

##### Returns

`RT` | `null`
