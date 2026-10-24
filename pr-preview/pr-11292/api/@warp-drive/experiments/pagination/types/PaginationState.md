---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/experiments/pagination/types/PaginationState.md
---

&#x20;

# &#x20;PaginationState\<RT = `unknown`, E = `unknown`>&#x20;

```ts
interface PaginationState<RT = unknown, E = unknown> {
  activePage: 
  | Readonly<PageCache<RT, E>>
  | null;
  adoptPage: (request: Future<RT>) => Promise<RT | null>;
  loadNext: () => Promise<RT | null>;
  loadPage: (url: string) => Promise<RT | null>;
  loadPrev: () => Promise<RT | null>;
  get activePageRequest(): Future<RT> | null;
  get data(): Iterable<ContentItem<RT>>;
  get hasNext(): boolean;
  get hasPrevious(): boolean;
  get nextRequest(): Future<RT> | null;
  get pages(): Iterable<Readonly<PageCache<RT, E>>>;
  get previousRequest(): Future<RT> | null;
  get totalPages(): number;
}
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:289](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L289)

**`Hideconstructor`**

The per-component, local pagination state. It houses the state that is unique
to a single component instance — the active page and navigation — while
referencing a shared [PaginationCache](PaginationCache.md) for the page graph and data.

This is the object yielded by the `<Paginate />` component, narrowed by the
component's `@mode` arg to one of its two navigation surfaces so the two
APIs cannot be mixed:

* **Paged** (`@mode="paged"`, the default): [PagedPaginationState](PagedPaginationState.md) —
  render [activePageRequest](#activepagerequest), navigate with [loadPage](#loadpage) (what the
  numbered/relational links call). Reads [activePage](#activepage).
* **Infinite** (`@mode="infinite"`): [InfinitePaginationState](InfinitePaginationState.md) — render
  [data](#data), wrap [nextRequest](#nextrequest)/[previousRequest](#previousrequest) in `<Request>`
  for loading state, and grow the view with [loadNext](#loadnext)/[loadPrev](#loadprev).

Both surfaces read the same shared page graph; the mode only selects which
API is exposed.

Instances are created via [getPaginationState](../functions/getPaginationState.md) (or by the `<Paginate />`
component on your behalf), never constructed directly.

## Type Parameters

### RT

`RT` = `unknown`

### E

`E` = `unknown`

## Implements

* [`PagedPaginationState`](PagedPaginationState.md)<`RT`, `E`>
* [`InfinitePaginationState`](InfinitePaginationState.md)<`RT`, `E`>

## Properties

### activePage

```ts
activePage: 
  | Readonly<PageCache<RT, E>>
  | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:295](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L295)

The page the paged surface is currently showing. Starts at the page this
component first loaded and moves whenever [loadPage](#loadpage) runs (for
example a numbered link is clicked).

#### Implementation of

```ts
PagedPaginationState.activePage
```

***

### adoptPage

```ts
adoptPage: (request: Future<RT>) => Promise<RT | null>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:438](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L438)

Adopts an externally-issued request into this pagination, making its page
the [activePage](#activepage) — the programmatic entry point for route-driven
navigation when managing a `PaginationState` directly (the `<Paginate />`
component uses the same mechanism for a changed `@request` arg).

Awaits the request and verifies that its document is a page of this
state's collection (same `first` — or `self` — link). On a match, the
page is loaded (a page already in the shared cache is reused) and — once
its request settles — committed: it becomes the active page, and the
infinite surface's run is kept coherent (a page already inside the run
leaves it untouched, an adjacent page extends it, a disjoint page resets
the run to the adopted page). The commit happens only after the page has
loaded, so the previous page stays active — and rendered — while the
adoption resolves. Returns the page's document.

Concurrent calls race safely: the latest call wins. An earlier in-flight
adoption is superseded and commits nothing, and a [loadPage](#loadpage)
navigation also supersedes a pending adoption (the user's click is the
newer intent).

Returns `null` — leaving the state untouched — whenever the adoption does
not commit:

* the request (or its page's load) rejected
* the document is a page of a *different* collection
* this state has not finished setting up its own collection yet
* the call was superseded by a newer navigation

```ts
const pages = getPaginationState(initialRequest);
// later, e.g. in a route model hook reacting to a ?page= param:
const adopted = await pages.adoptPage(store.request(query));
if (adopted === null) {
  // not part of this collection — start a fresh pagination
}
```

It is a stable reference, so it is safe to pass around as an "action" or
"event" handler.

#### Parameters

##### request

`Future`<`RT`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Implementation of

```ts
PagedPaginationState.adoptPage
```

***

### loadNext

```ts
loadNext: () => Promise<RT | null>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:470](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L470)

Extends the forward frontier by one page, appending it to [data](#data).
Mirror of [loadPrev](#loadprev).

In templates it is also available as the `loadNext` content feature
([InfinitePaginationContentFeatures.loadNext](InfinitePaginationContentFeatures.md#loadnext)) yielded by
`<Paginate />`; the two are the same function.

```gts
<button {{on "click" pages.loadNext}}>Load more</button>
```

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Implementation of

```ts
InfinitePaginationState.loadNext
```

***

### loadPage

```ts
loadPage: (url: string) => Promise<RT | null>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:497](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L497)

Loads a specific page by its URL and makes it the [activePage](#activepage),
requesting it first if it is not already loaded. This is the paged surface's
navigation entry point, called by the numbered and relational links.

In templates it is also available as the `loadPage` content feature
([PagedPaginationContentFeatures.loadPage](PagedPaginationContentFeatures.md#loadpage)) yielded by `<Paginate />`;
the two are the same function.

It is a stable reference, so it is safe to pass around as an "action" or
"event" handler. Returns the page's value, or `null` if it has none or
the load fails.

On failure the page stays active and [activePageRequest](#activepagerequest) resolves to
it, so a wrapping `<Request>` renders its error block. Calling again (for
example clicking the page's link a second time) retries: the failed page
is re-requested with a forced reload.

```gts
<EachLink @pages={{pages}}>
  <:link as |link|>
    <button {{on "click" (fn features.loadPage link.url)}}>{{link.text}}</button>
  </:link>
</EachLink>
```

#### Parameters

##### url

`string`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Implementation of

```ts
PagedPaginationState.loadPage
```

***

### loadPrev

```ts
loadPrev: () => Promise<RT | null>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:457](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L457)

Extends the backward frontier by one page, prepending it to [data](#data).
The frontier advances only once the page has loaded, so
[previousRequest](#previousrequest) tracks the in-flight page meanwhile. Returns the
loaded value, or `null` when there is no previous page or the load fails.

On failure the frontier stays put and [previousRequest](#previousrequest) keeps
resolving to the failed page, so a wrapping `<Request>` renders its error
block. Calling again retries: the failed page is re-requested with a
forced reload.

In templates it is also available as the `loadPrev` content feature
([InfinitePaginationContentFeatures.loadPrev](InfinitePaginationContentFeatures.md#loadprev)) yielded by
`<Paginate />`; the two are the same function.

It is a stable reference, so it is safe to pass around as an "action" or
"event" handler.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`RT` | `null`>

#### Implementation of

```ts
InfinitePaginationState.loadPrev
```

### activePageRequest

#### Get Signature

```ts
get activePageRequest(): Future<RT> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:314](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L314)

The request for the [activePage](#activepage), for the paged surface to render. This
is what a single-page view wraps in a `<Request>` to show the active page's
loading, error, and content states:

```gts
<Paginate @request={{this.request}}>
  <:content as |pages|>
    <Request @request={{pages.activePageRequest}}>
      <:content as |result|>
        {{#each result.data as |item|}}...{{/each}}
      </:content>
    </Request>
  </:content>
</Paginate>
```

##### Returns

`Future`<`RT`> | `null`

#### Implementation of

```ts
PagedPaginationState.activePageRequest
```

***

### data

#### Get Signature

```ts
get data(): Iterable<ContentItem<RT>>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:360](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L360)

The accumulated items across the loaded run, from the backward frontier to
the forward frontier inclusive — the single set an infinite collection renders.
Grows as [loadNext](#loadnext)/[loadPrev](#loadprev) extend the frontier. Scoped to this
component's frontier (not the shared cache), so components paging the same
collection to different extents each see only what they have scrolled through.

The flattened items of [pages](#pages), as one contiguous iterable. For the
items of every loaded page in the whole collection, see
[PaginationCache.data](PaginationCache.md#data).

```gts
<Paginate @request={{this.request}} @mode="infinite">
  <:content as |pages features|>
    {{#each pages.data as |item|}}...{{/each}}
    {{#if pages.hasNext}}
      <button {{on "click" features.loadNext}}>Load more</button>
    {{/if}}
  </:content>
</Paginate>
```

##### Returns

[`Iterable`](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html#iterable-interface)<`ContentItem`<`RT`>>

#### Implementation of

```ts
InfinitePaginationState.data
```

***

### hasNext

#### Get Signature

```ts
get hasNext(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:371](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L371)

Whether a page exists after the forward frontier — i.e. there is more to load
going forward. Use to hide the trailing load-more sentinel at end-of-list:

```gts
{{#if pages.hasNext}}
  <button {{on "click" features.loadNext}}>Load more</button>
{{/if}}
```

##### Returns

`boolean`

#### Implementation of

```ts
InfinitePaginationState.hasNext
```

***

### hasPrevious

#### Get Signature

```ts
get hasPrevious(): boolean;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:375](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L375)

Whether a page exists before the backward frontier.

##### Returns

`boolean`

#### Implementation of

```ts
InfinitePaginationState.hasPrevious
```

***

### nextRequest

#### Get Signature

```ts
get nextRequest(): Future<RT> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:391](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L391)

The request for the page just after the forward frontier, for the infinite
surface. `null` until [loadNext](#loadnext) fires it (so a `<Request>` wrapping it
renders its idle block), the in-flight `Future` while that page loads, then
`null` again once the frontier advances onto it. Also `null` at end-of-list.

```gts
{{#if pages.hasNext}}
  <Request @request={{pages.nextRequest}}>
    <:idle><button {{on "click" features.loadNext}}>Load more</button></:idle>
    <:loading><Spinner /></:loading>
  </Request>
{{/if}}
```

##### Returns

`Future`<`RT`> | `null`

#### Implementation of

```ts
InfinitePaginationState.nextRequest
```

***

### pages

#### Get Signature

```ts
get pages(): Iterable<Readonly<PageCache<RT, E>>>;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:337](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L337)

The pages of the run this component is viewing, from the backward frontier
to the forward frontier inclusive, in order. Part of the infinite surface:
it is the same run as [data](#data), yielding the [PageCache](PageCache.md) objects
instead of their flattened items — use it when the UI needs per-page
boundaries or request states.

Grows as [loadNext](#loadnext)/[loadPrev](#loadprev) extend the frontier. Scoped to
this component's frontier (not the shared cache), so components paging the
same collection to different extents each see only what they have scrolled
through. For every page known to the whole collection, see
[PaginationCache.pages](PaginationCache.md#pages).

##### Returns

[`Iterable`](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html#iterable-interface)<[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`PageCache`](PageCache.md)<`RT`, `E`>>>

#### Implementation of

```ts
InfinitePaginationState.pages
```

***

### previousRequest

#### Get Signature

```ts
get previousRequest(): Future<RT> | null;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:396](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L396)

The request for the page just before the backward frontier. Mirror of
[nextRequest](#nextrequest) for [loadPrev](#loadprev).

##### Returns

`Future`<`RT`> | `null`

#### Implementation of

```ts
InfinitePaginationState.previousRequest
```

***

### totalPages

#### Get Signature

```ts
get totalPages(): number;
```

Defined in: [node\_modules/.pnpm/@warp-d\_5e1563e0e582c8365bb74466d3761d6d/node\_modules/@warp-drive/core/dist/signals/-leaked.d.ts:323](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_5e1563e0e582c8365bb74466d3761d6d/node_modules/@warp-drive/core/dist/signals/-leaked.d.ts#L323)

The total number of pages in the collection, or `0` when it is unknown (for
example a cursor-based collection that reports no total).

```gts
<p>Page {{pages.activePage.pageNumber}} of {{pages.totalPages}}</p>
```

##### Returns

`number`

#### Implementation of

[`PagedPaginationState`](PagedPaginationState.md).[`totalPages`](PagedPaginationState.md#totalpages)
