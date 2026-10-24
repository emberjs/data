---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/guides/the-manual/experiments/pagination.md
description: >-
  Paginate a collection with the experimental `getPaginationState` primitives
  and the `<Paginate />` and `<EachLink />` Ember components in paged or
  infinite mode.
---

# Pagination

***Warp*Drive**'s pagination primitives turn the request that loads the first page of a
collection into a reactive object that knows about the whole collection: which pages have
loaded, which one is active, and how to reach the rest. Rendering a numbered pager, an infinite
feed, or both over the same data becomes a matter of choosing which parts of that state to
render.

The API is published from two entry points:

* [`@warp-drive/experiments/pagination`](/api/@warp-drive/experiments/pagination/) holds the
  framework-agnostic primitives: `getPaginationState`, `getPaginationLinks` and
  `createPaginationSubscription`.
* [`@warp-drive/ember/experiments`](/api/@warp-drive/ember/experiments/) holds the Ember
  components that build on them: `<Paginate />` and `<EachLink />`.

Install whichever your app does not already have:

```sh
pnpm add @warp-drive/experiments @warp-drive/ember
```

Nothing else needs configuring. The primitives work with any store whose cache preserves a
document's `links` and `meta`, which the [`@warp-drive/json-api`](/api/@warp-drive/json-api/)
cache does. An app on the `ember-data` meta package already has that cache, a `RequestManager`
and the legacy network handler set up (see [`@ember-data/store`](/api/@ember-data/store/)).

:::warning ⚠️ Experimental
Like everything under [Experiments](./index.md), this API has not been through an RFC and may
change or be removed in a minor release.
:::

## Why Pagination Primitives?

Paginated lists are where request code stops being simple. The list needs to know which pages
are loaded and which one the user is looking at. Two components showing the same list, a table
and a summary count for instance, should not load its pages twice. Each page load has its own
loading and error state, separate from the list as a whole. And the same data often has to power
two different UIs, a numbered pager on desktop and an infinite feed on mobile.

The pagination primitives handle this by splitting the state in two:

* A **shared page cache** for each collection. Every component paginating the same collection
  reads from the same cache, so a page loaded by one is available to all of them. Collections
  are identified by the `first` link of their response document (or `self` when there is no
  `first`), which is why the primitives need pagination links to work.
* A **per-consumer pagination state** that holds the local navigation state: the active page in
  a paged UI, or the loaded run of pages in an infinite one. It is keyed by the identity of the
  request that loaded the first page, the same way
  [`getRequestState`](/api/@warp-drive/core/reactive/functions/getRequestState) is, so a template
  and the JavaScript behind it observing the same request share one state.

Both pieces are reactive. Reading `totalPages` in a template re-renders when a later page reveals
it, and a page loaded through one component's links appears in every other component's state.
For the reactivity model these primitives build on, see
[Reactive Control Flow](../reactivity/control-flow.md).

## Your API Must Provide Pagination Links

The primitives navigate by following the `links` a response document carries. A response
document is the structured form a request's response takes once it is in the cache: its `data`,
plus `links` and `meta` about the response as a whole (see
[Using the Response](../requests/using-the-response.md)). A page's document should expose some
of:

```json
{
  "data": [],
  "links": {
    "self": "/users?page=2",
    "first": "/users?page=1",
    "prev": "/users?page=1",
    "next": "/users?page=3",
    "last": "/users?page=10"
  }
}
```

This is the `{json:api}` convention, and the
[`@warp-drive/json-api`](/api/@warp-drive/json-api/) cache preserves a compliant response's
`links` as-is. Only `self` and the links that exist are required: a cursor-based API that exposes
just `prev` and `next` works, it simply has no page numbers to render.

:::tip Your API does not generate links?
Add a [request handler](../requests/handlers.md) that computes the `links` for paginated
responses before they reach the cache. This is worth doing even if you never use `<Paginate />`,
since several ***Warp*Drive** features work best when documents carry links.
:::

## Two Modes: Paged and Infinite

A pagination state exposes two navigation surfaces over the same shared cache.

[**Paged**](/api/@warp-drive/experiments/pagination/types/PagedPaginationState) is a single-page
view. Render the active page, and navigate by loading a specific page URL, usually from the links
the response provides. `activePageRequest` is a
[`Future`](/api/@warp-drive/core/request/types/Future), the same kind of request object
`store.request()` returns.

```ts
interface PagedPaginationState<RT, E> {
  activePage: PageCache<RT, E> | null;
  activePageRequest: Future<RT> | null;
  totalPages: number;
  loadPage: (url: string) => Promise<RT | null>;
}
```

[**Infinite**](/api/@warp-drive/experiments/pagination/types/InfinitePaginationState) is an
accumulating view. Render `data`, the items of every loaded page in order, and grow it at either
end. `pages` is the same run as `data` but yields each page's
[`PageCache`](/api/@warp-drive/experiments/pagination/types/PageCache), for UIs that need page
boundaries or per-page request state.

```ts
interface InfinitePaginationState<RT, E> {
  data: Iterable<ContentItem<RT>>;
  pages: Iterable<PageCache<RT, E>>;
  hasNext: boolean;
  hasPrevious: boolean;
  nextRequest: Future<RT> | null;
  previousRequest: Future<RT> | null;
  totalPages: number;
  loadNext: () => Promise<RT | null>;
  loadPrev: () => Promise<RT | null>;
}
```

In JavaScript, a
[`PaginationState`](/api/@warp-drive/experiments/pagination/types/PaginationState) carries both
surfaces and you use whichever fits. The `<Paginate />` component's `@mode` arg (`'paged'`, the
default, or `'infinite'`) narrows what it yields to one surface so the two cannot be mixed by
accident. The mode is type-only and is never read at runtime.

## Using the Component API

`<Paginate />` is declarative control flow in the style of
[`<Request />`](/api/@warp-drive/ember/classes/Request). It renders no markup of its own. Give it
the request that loads the first page, either as `@request`, a `Future` your code already issued
with `store.request`, or as `@query`, a request object such as a builder's return value that the
component issues for you. It yields the pagination state to one of its blocks:

* `idle`, `loading`, `cancelled` and `error` describe the **initial request only**. Later page
  loads never re-enter `loading`; they surface through the individual page requests instead.
* `content` renders once the first page is loaded. It receives `pages`, the pagination state
  narrowed to the component's mode, and `features`, the controls for the initiating request.
* `always` renders in every state, and a `default` block replaces all named blocks and renders
  regardless of request state, for components that manage control flow themselves. Both receive
  the same params as `content`.

The `features` object carries the same request controls `<Request />` yields to its content
block (`refresh`, `reload`, `isRefreshing`, `abort`, `latestRequest`, `isOnline`, `isHidden`),
plus `isNavigating` (see [Route-Driven Navigation](#route-driven-navigation)) and the mode's
navigation entry point: `loadPage` in
[paged mode](/api/@warp-drive/experiments/pagination/types/PagedPaginationContentFeatures),
`loadNext` and `loadPrev` in
[infinite mode](/api/@warp-drive/experiments/pagination/types/InfinitePaginationContentFeatures).
`<Paginate />` also accepts the same `@autorefresh`, `@autorefreshThreshold` and
`@autorefreshBehavior` args as `<Request />`; see its
[API docs](/api/@warp-drive/ember/classes/Request) for what they do.

### Paged: Render the Active Page and Its Links

In paged mode, `pages.activePageRequest` is a plain request, so wrap it in `<Request />` for the
active page's own loading and error states. Its `result.data` holds the same record instances the
store hands out everywhere else, so in a legacy app they are your Model instances and their
relationships work as usual. `<EachLink />` yields the navigation links derived from the same
state; you decide which to render and how.

```glimmer-ts [Ember]
import { Request } from '@warp-drive/ember';
import { EachLink, Paginate } from '@warp-drive/ember/experiments';

<template>
  <Paginate @request={{@request}}>
    <:loading><Spinner /></:loading>

    <:content as |pages|>
      <Request @request={{pages.activePageRequest}}>
        <:loading><Spinner /></:loading>
        <:error as |error|><ErrorForm @error={{error}} /></:error>
        <:content as |result|>
          {{#each result.data as |user|}}
            <UserRow @user={{user}} />
          {{/each}}
        </:content>
      </Request>

      <EachLink @pages={{pages}} as |state|>
        {{#if state.prev}}
          <button {{on "click" state.prev.setActive}}>Previous</button>
        {{/if}}

        {{#each state.links as |link|}}
          {{#if link.isReal}}
            <button class={{if link.isCurrent "active"}} {{on "click" link.setActive}}>{{link.text}}</button>
          {{else}}
            <span>…</span>
          {{/if}}
        {{/each}}

        {{#if state.next}}
          <button {{on "click" state.next.setActive}}>Next</button>
        {{/if}}
      </EachLink>
    </:content>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
</template>
```

The state `<EachLink />` yields is a
[`PaginationLinks`](/api/@warp-drive/experiments/pagination/types/PaginationLinks):

* `links` are the numbered links. Gaps of not-yet-loaded pages are represented by placeholders,
  so check `isReal` before rendering a link as a button. A real link has `index`, `text`,
  `isCurrent` and a stable `setActive` action that loads its page and makes it active. This list
  is empty for cursor-based collections.
* `prev` and `next` are the relational links for the active page, or `null` at the collection's
  edges. For cursor-based collections they are the only navigation.
* `first` and `last` are the links to the collection's edges, when the response exposes them.
  They are usually present on every page, including the edge page itself, where `isCurrent` is
  `true` so you can disable the control.

### Infinite: Render an Accumulating List

In infinite mode, render `pages.data` and grow it with `features.loadNext` or `features.loadPrev`.
`pages.nextRequest` and `pages.previousRequest` are `null` until a load is triggered, then hold
the in-flight request until it succeeds. If a load fails they keep pointing at the failed request,
so wrapping them in `<Request />` gives you a loading state, an error state with retry, and a
load-more button from its `idle` block, all placed wherever your layout wants them.

```glimmer-ts [Ember]
import { Request } from '@warp-drive/ember';
import { Paginate } from '@warp-drive/ember/experiments';

<template>
  <Paginate @request={{@request}} @mode="infinite">
    <:loading><Spinner /></:loading>

    <:content as |pages features|>
      {{#each pages.data as |user|}}
        <UserRow @user={{user}} />
      {{/each}}

      {{#if pages.hasNext}}
        <Request @request={{pages.nextRequest}}>
          <:idle><button {{on "click" features.loadNext}}>Load more</button></:idle>
          <:loading><Spinner /></:loading>
          <:error as |error state|>
            <ErrorForm @error={{error}} />
            <button {{on "click" state.retry}}>Retry</button>
          </:error>
        </Request>
      {{/if}}
    </:content>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
</template>
```

Because `pages.loadNext` and `pages.loadPrev` are plain functions, they also pair directly with
virtual-scroll components that fire a callback when the user reaches an end of the list.

## Using the JS API

[`getPaginationState`](/api/@warp-drive/experiments/pagination/functions/getPaginationState)
returns the pagination state for a request. Calling it again with the same request returns the
same instance.

```ts
import { getPaginationState } from '@warp-drive/experiments/pagination';

const request = store.request({ url: '/users', method: 'GET' });
const pages = getPaginationState(request);

await request;
pages.totalPages; // known now, if the response exposed it
await pages.loadNext();

for (const user of pages.data) {
  // the first two pages
}
```

[`getPaginationLinks`](/api/@warp-drive/experiments/pagination/functions/getPaginationLinks)
derives the same links object `<EachLink />` yields, for building navigation outside a template:

```ts
import { getPaginationLinks, getPaginationState } from '@warp-drive/experiments/pagination';

const pages = getPaginationState(request);
const links = getPaginationLinks(pages);

links.next?.setActive();
```

[`createPaginationSubscription`](/api/@warp-drive/experiments/pagination/functions/createPaginationSubscription)
creates the lifecycle object `<Paginate />` builds for itself: a
[`PaginationSubscription`](/api/@warp-drive/experiments/pagination/types/PaginationSubscription)
that owns the request subscription for the initial request (loading and error state, autorefresh)
together with its pagination state. Create one yourself and pass it to the component's
`@subscription` arg when the lifecycle should outlive a single component or be shared between
several; the component then uses it instead of creating and tearing down its own, and tearing it
down becomes your responsibility.

```ts
import { createPaginationSubscription } from '@warp-drive/experiments/pagination';

const subscription = createPaginationSubscription(store, { request });

subscription.paginationState; // the PaginationState the component would yield
```

## Page Hints

The state learns `totalPages` and each page's number from the response. By default it reads
`meta.page` or `meta.currentPage` and `meta.totalPages` from the document (see
[`defaultPageHints`](/api/@warp-drive/experiments/pagination/variables/defaultPageHints)). When
your API puts them elsewhere, provide a
[`PageHints`](/api/@warp-drive/experiments/pagination/types/PageHints) function:

```ts
import type { PageHints } from '@warp-drive/experiments/pagination';

export const pageHints: PageHints = (document) => {
  const info = document.meta?.pageInfo as { index: number; count: number } | undefined;
  return { currentPage: info?.index ?? 0, totalPages: info?.count ?? 0 };
};
```

Pass it as the second argument of `getPaginationState`, or as `@pageHints` on `<Paginate />`.

Write your own hints whenever `meta.page` is anything other than the current page number. A
`{json:api}` API that reports `meta: { page: { total: 10 } }` is the common case: the default
hints would read that object as the page number. Return `0` for a value the response does not
expose; `0` means "unknown", and the state falls back to `prev` and `next` navigation for whatever
it cannot number.

Page hints attach to the shared cache, so they belong to the collection rather than to any one
component. Every consumer of a collection must pass the **same function reference**: define it
once at module scope and import it everywhere, as above. The first hint a collection receives is
installed on its cache; a consumer that later passes a different function for the same
collection fails a development-mode assertion, and in production its hint is silently ignored.

For cursor-based APIs with no page numbers, leave the hints out. `totalPages` stays `0`, the
numbered `links` stay empty, and navigation happens through `prev` and `next`.

## Route-Driven Navigation

When the active page is part of the URL, a `?page=` query param the route turns into a request
for instance, the `@request` arg changes as the user navigates. `<Paginate />` does not tear down
when that happens. The existing content stays rendered with `features.isNavigating` set to
`true` while the new request resolves. A request that resolves to a page of the same collection
becomes the active page; one that resolves to a different collection resets the state as if it
were a fresh start. The browser back button therefore works without any extra code.

In this setup the route owns the page number, so the page links should change the URL rather than
call `setActive`, which loads a page without touching the URL. A numbered link's `index` is its
page number:

```glimmer-ts [Ember]
import { LinkTo } from '@ember/routing';
import { Request } from '@warp-drive/ember';
import { EachLink, Paginate } from '@warp-drive/ember/experiments';

<template>
  <Paginate @request={{@model.request}}>
    <:content as |pages|>
      <Request @request={{pages.activePageRequest}}>
        <:content as |result|>
          {{#each result.data as |post|}}<PostRow @post={{post}} />{{/each}}
        </:content>
      </Request>

      <EachLink @pages={{pages}} as |state|>
        {{#each state.links as |link|}}
          {{#if link.isReal}}
            <LinkTo @route="posts" @query={{hash page=link.index}}>{{link.text}}</LinkTo>
          {{/if}}
        {{/each}}
      </EachLink>
    </:content>
  </Paginate>
</template>
```

with the route declaring `queryParams = { page: { refreshModel: true } }` and building the request
from `page` as shown in [Coming from Legacy Queries](#coming-from-legacy-queries).

## Coming from Legacy Queries

The legacy `store.query` and `store.findAll` methods resolve to an array of records. The
pagination primitives need the request itself, because the request's document is where the
`links` and `meta` live. Replace the call with `store.request` and a
[request builder](../requests/builders.md), and keep the page parameters in the query:

::: code-group

```ts [Before]
export default class PostsRoute extends Route {
  @service declare store: Store;

  model() {
    return this.store.query('post', { page: { number: 1, size: 25 } });
  }
}
```

```ts [After]
import { query } from '@warp-drive/utilities/json-api';

export default class PostsRoute extends Route {
  @service declare store: Store;

  model() {
    // Return the request inside an object. A Future is a promise, so returning it
    // directly would make the route wait for the response and hand the template
    // the resolved document instead of the request `<Paginate />` needs.
    return { request: this.store.request(query('post', { 'page[number]': 1, 'page[size]': 25 })) };
  }
}
```

:::

The template then passes `@model.request` to `<Paginate />`. If the request is created in the
same component that renders it, pass the builder's result as `@query` instead and skip
`store.request` altogether.

## API Reference

* [`@warp-drive/experiments/pagination`](/api/@warp-drive/experiments/pagination/): the primitives
  and their types, including
  [`PaginationState`](/api/@warp-drive/experiments/pagination/types/PaginationState) with its
  [`PagedPaginationState`](/api/@warp-drive/experiments/pagination/types/PagedPaginationState)
  and
  [`InfinitePaginationState`](/api/@warp-drive/experiments/pagination/types/InfinitePaginationState)
  surfaces, [`PageCache`](/api/@warp-drive/experiments/pagination/types/PageCache),
  [`PageHints`](/api/@warp-drive/experiments/pagination/types/PageHints) and
  [`PaginationLinks`](/api/@warp-drive/experiments/pagination/types/PaginationLinks).
* [`<Paginate />`](/api/@warp-drive/ember/experiments/classes/Paginate) and
  [`<EachLink />`](/api/@warp-drive/ember/experiments/classes/EachLink) in
  `@warp-drive/ember/experiments`.
* [`<Request />`](/api/@warp-drive/ember/classes/Request) in `@warp-drive/ember`, for the
  per-page request states shown above.
