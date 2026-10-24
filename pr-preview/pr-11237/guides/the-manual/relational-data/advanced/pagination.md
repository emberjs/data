---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/guides/the-manual/relational-data/advanced/pagination.md
---
# Pagination

Relationships in WarpDrive are **not paginated**. A `collection` relationship (or `hasMany`) holds
one complete membership; pagination links present on a relationship payload are surfaced on
`doc.links` but are never merged into `data`.

Paginated lists are loaded with **top-level requests**. This page shows the pattern.

## Why Top-Level Requests

A paginated list is a *query result*, not a fact about the parent resource. Modelling it as a
request gives you things a relationship cannot:

* each page is its own cached document with its own `links` and `meta`,
* query parameters (`page`, `sort`, `filter`, `include`, `fields`) are part of the identity,
* different sorts or filters of the same list coexist in the cache,
* the [pagination utilities](#reactive-pagination) can walk `next`/`prev` links for you,
* the parent resource stays small and cheap to load.

## Requesting A Page

Write a [builder](../../requests/builders.md) for the endpoint, or use one of the builders in
`@warp-drive/utilities`:

```ts
import { query } from '@warp-drive/utilities/json-api';

const firstPage = await store.request(
  query<Comment>('comment', {
    filter: { post: post.id },
    sort: '-createdAt',
    page: { size: 25 },
  })
);

firstPage.content.data;       // Comment[]
firstPage.content.links.next; // '/comments?filter[post]=1&page[number]=2&...'
firstPage.content.meta;       // { total: 400 }
```

The response `content` is a [ReactiveDocument](/api/@warp-drive/core/reactive/types/ReactiveDocument),
which can follow its own pagination links:

```ts
const secondPage = await firstPage.content.next();
```

## Using The Relationship's Link

If the API places a `related` link on the relationship, it is a fine way to discover the endpoint.
Build a top-level request from it:

```ts
const firstPage = await store.request({ url: `${post.comments.links.related}?page[size]=25` });
```

Don't page with `doc.fetch()`. It always requests the relationship's link as-is, and it replaces
the relationship's membership with whatever the response contains.

## Reactive Pagination

For UI, use the pagination utilities rather than awaiting pages by hand. The framework-agnostic
`createPaginationSubscription` and `getPaginationState` live in `@warp-drive/core`, and
`@warp-drive/ember` ships `<Paginate>` and `<EachLink>` (currently under
`@warp-drive/ember/experiments`):

```gjs
import { Paginate, EachLink } from '@warp-drive/ember/experiments';
import { Request } from '@warp-drive/ember';

<template>
  <Paginate @request={{@request}}>
    <:content as |pages|>
      <Request @request={{pages.activePageRequest}}>
        <:content as |result|>
          {{#each result.data as |comment|}}<Comment @comment={{comment}} />{{/each}}
        </:content>
      </Request>
      <EachLink @pages={{pages}} as |state|>
        <button {{on "click" state.activate}}>{{state.label}}</button>
      </EachLink>
    </:content>
  </Paginate>
</template>
```

`@mode="infinite"` renders all loaded pages as one list. See the component's API docs for the full
set of arguments.

## Keeping Relationships And Lists Consistent

When a paginated list and a relationship describe the same data — a post's `comments` relationship
and a paginated `/comments?filter[post]=1` query — pick one as the source of truth for the UI.
Usually that is the request. Keep the relationship for `inverse` bookkeeping (a comment's `post`)
and for cases where the full list is small, and configure
[`maxCollectionRelationshipSize`](./large-collections.md) so you find out if the relationship
starts receiving more than it should.
