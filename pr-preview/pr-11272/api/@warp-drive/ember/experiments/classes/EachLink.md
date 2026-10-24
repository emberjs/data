---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/ember/experiments/classes/EachLink.md
---

# &#x20;\<EachLink />&#x20;

Defined in: [warp-drive-packages/ember/dist/experiments.d.ts:320](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/experiments.d.ts#L320)

The `<EachLink />` component yields the navigation links for a paginated
collection, derived from the [PagedPaginationState](../../../experiments/pagination/types/PagedPaginationState.md) a `<Paginate />`
component yields to its `content` block.

It renders no markup of its own: it yields a single [PaginationLinks](../../../experiments/pagination/types/PaginationLinks.md)
object, and the consumer decides which links to render, with what markup,
and in what order.

The yielded state provides:

* `links` — the numbered links, with [PlaceholderPaginationLink](../../../experiments/pagination/types/PlaceholderPaginationLink.md)
  placeholders standing in for gaps of not-yet-loaded pages. Discriminate
  with `isReal`. Empty for cursor-based collections, which have no page
  numbers to render.
* `prev` / `next` — the relational links for the active page, or `null` at
  the collection's edges. Available in both numbered and cursor-based
  pagination, and the only navigation a cursor-based collection has.
* `first` / `last` — the relational links to the collection's edges, when
  the response exposes them. Usually present on every page — including the
  edge page itself, where the link's `isCurrent` is `true` (useful for
  disabling the control).

Every link exposes `setActive` to load its page and make it the active page
of the pagination state, keeping every component reading that state in sync.

```gts
import { Paginate, EachLink } from '@warp-drive/ember/experiments';

<template>
  <Paginate @request={{@request}}>
    <:content as |pages|>
      ...
      <EachLink @pages={{pages}} as |state|>
        {{#if state.prev}}
          <button {{on "click" state.prev.setActive}}>Previous</button>
        {{/if}}

        {{#each state.links as |link|}}
          {{#if link.isReal}}
            <button
              class={{if link.isCurrent "active"}}
              {{on "click" link.setActive}}
            >{{link.text}}</button>
          {{else}}
            <span title="{{link.rangeSize}} more pages">…</span>
          {{/if}}
        {{/each}}

        {{#if state.next}}
          <button {{on "click" state.next.setActive}}>Next</button>
        {{/if}}
      </EachLink>
    </:content>
  </Paginate>
</template>
```

Since the links all read from the shared page graph, they update as pages
load and as the active page changes.

## Extends

* `default`<`EachLinkSignature`<`RT`, `E`>>

## Type Parameters

### RT

`RT`

### E

`E`

## Constructors

### Constructor

```ts
new EachLink<RT, E>(owner: Owner, args: {
  pages: PagedPaginationState<RT, E>;
}): EachLink<RT, E>;
```

Defined in: [node\_modules/.pnpm/@glimmer+component@2.1.1/node\_modules/@glimmer/component/dist/index.d.ts:389](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@glimmer+component@2.1.1/node_modules/@glimmer/component/dist/index.d.ts#L389)

#### Parameters

##### owner

`Owner`

##### args

###### pages

[`PagedPaginationState`](../../../experiments/pagination/types/PagedPaginationState.md)<`RT`, `E`>

The paged pagination state (yielded by `<Paginate />`) to derive the
navigation links from.

#### Returns

`EachLink`<`RT`, `E`>

#### Inherited from

```ts
Component<EachLinkSignature<RT, E>>.constructor
```

## Methods

### willDestroy()

```ts
willDestroy(): void;
```

Defined in: [warp-drive-packages/ember/dist/experiments.d.ts:323](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/experiments.d.ts#L323)

Called before the component has been removed from the DOM.

#### Returns

`void`

#### Overrides

```ts
Component.willDestroy
```
