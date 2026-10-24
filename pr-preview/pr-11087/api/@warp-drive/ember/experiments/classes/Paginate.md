---
url: /pr-preview/pr-11087/api/@warp-drive/ember/experiments/classes/Paginate.md
---

# &#x20;\<Paginate />&#x20;

Defined in: [warp-drive-packages/ember/dist/experiments.d.ts:199](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/ember/dist/experiments.d.ts#L199)

The `<Paginate />` component provides declarative, reactive control-flow for
rendering a paginated collection: it monitors the request that loads the
collection's entry page and yields a pagination state for navigating and
rendering the collection's pages.

## Blocks

Five states, only one of which renders at a time:

* `idle`: no request to monitor yet. If the component is idle and no idle
  block is provided, an error is thrown.
* `loading`: the collection is blocking-loading — only the very first page
  load (or the reset to a different collection) enters this state. Receives
  the request's `RequestLoadingState` for progress UIs. Navigating with
  `loadPage`/`loadNext`/`loadPrev` does not re-enter it; those surface
  through the individual page requests instead.
* `cancelled`: the initial request was aborted. Falls through to the `error`
  block when no cancelled block is provided; if neither block exists the
  cancellation is swallowed.
* `error`: the initial request rejected. If no error block is provided, the
  error is rethrown — provide one if the failure should not crash the app.
  Both `cancelled` and `error` receive the error and recovery features
  (`retry`, `isOnline`, `isHidden`).
* `content`: the collection is ready. Receives the pagination state
  (`pages`) and the content features.

Two additional blocks sit outside the state machine: `always` renders in
every state, and providing a `default` block replaces all named blocks —
it renders regardless of the request's state, for consumers managing
control-flow themselves. Both receive the same params as `content`.

## Modes

The `@mode` arg (`'paged'`, the default, or `'infinite'`) narrows the state
and features yielded to `content`/`always`/`default` to one of the two
navigation surfaces so the APIs cannot be mixed. It is type-only and never
read at runtime.

**Paged** — render the active page via its request, navigate with `loadPage`
or the links yielded by `<EachLink />`:

```gts
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
          {{#each result.data as |item|}}...{{/each}}
        </:content>
      </Request>

      <EachLink @pages={{pages}} as |state|>
        {{#each state.links as |link|}}
          {{#if link.isReal}}
            <button
              class={{if link.isCurrent "active"}}
              {{on "click" link.setActive}}
            >{{link.text}}</button>
          {{else}}
            <span>…</span>
          {{/if}}
        {{/each}}
      </EachLink>
    </:content>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
</template>
```

**Infinite** — render the accumulated `data`, grow it with
`loadNext`/`loadPrev`:

```gts
<template>
  <Paginate @request={{@request}} @mode="infinite">
    <:loading><Spinner /></:loading>

    <:content as |pages features|>
      {{#each pages.data as |item|}}...{{/each}}
      {{#if pages.hasNext}}
        <button {{on "click" features.loadNext}}>Load more</button>
      {{/if}}
    </:content>
  </Paginate>
</template>
```

## Shared collection state

Loaded pages live in a cache shared by every component paginating the same
collection (identified by its `first` — or `self` — link), while each
`<Paginate />` keeps its own local navigation state (active page, loaded
run). The `@pageHints` arg supplies `currentPage`/`totalPages` when the
response does not expose them in the default `meta` locations; because the
hints attach to the shared cache, every component sharing a collection must
pass the same function reference.

## Route-driven navigation

A changed `@request` arg does not tear the component down. The existing
content stays rendered — with `features.isNavigating` set to `true` — while
the new request resolves: a request that resolves to a page of the same
collection is adopted as the new active page (for example the browser back
button changing a `?page=` query param the route turns into a request); one
that resolves to a different collection resets the pagination like a fresh
start.

## Request lifecycle

The content features expose the same `refresh`/`reload` controls as
`<Request />`, applied to the collection's initiating request, and the
component accepts the same `@autorefresh`, `@autorefreshThreshold` and
`@autorefreshBehavior` args (see the `<Request />` component's
documentation). To manage the lifecycle externally, create the subscription
with `createPaginationSubscription` and pass it via `@subscription` — the
component then uses it instead of creating and disposing its own.

## Extends

* `default`<`PaginateSignature`<`RT`, `E`, `M`>>

## Type Parameters

### RT

`RT`

### E

`E`

### M

`M` *extends* `PaginateMode$1` = `"paged"`

## Constructors

### Constructor

```ts
new Paginate<RT, E, M extends PaginateMode = "paged">(owner: Owner, args: EmberPaginateArgs<RT>): Paginate<RT, E, M>;
```

Defined in: [node\_modules/.pnpm/@glimmer+component@2.1.1/node\_modules/@glimmer/component/dist/index.d.ts:389](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/node_modules/.pnpm/@glimmer+component@2.1.1/node_modules/@glimmer/component/dist/index.d.ts#L389)

#### Parameters

##### owner

`Owner`

##### args

`EmberPaginateArgs`<`RT`>

#### Returns

`Paginate`<`RT`, `E`, `M`>

#### Inherited from

```ts
Component<PaginateSignature<RT, E, M>>.constructor
```

## Methods

### willDestroy()

```ts
willDestroy(): void;
```

Defined in: [warp-drive-packages/ember/dist/experiments.d.ts:235](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/ember/dist/experiments.d.ts#L235)

Called before the component has been removed from the DOM.

#### Returns

`void`

#### Overrides

```ts
Component.willDestroy
```
