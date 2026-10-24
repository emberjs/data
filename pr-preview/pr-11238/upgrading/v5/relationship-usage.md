---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/upgrading/v5/relationship-usage.md
---

# Migrating Async Relationship Usage

&#x20;  authored 2026-09-24

This guide is for apps whose `async: true` `belongsTo` and `hasMany` relationships are consumed
*implicitly*: iterated with an `#each` block, read through `.content`, or walked by getters and computed
properties, often several levels deep (`post.author.company.name`). Those sites depend on two
legacy behaviors, fetch-on-access and promise proxies, that the `resource` and `collection` field
kinds do not have.

It is the companion to
[Migrating Relationships to `resource` and `collection`](./relationships.md), which covers the
schema fields. This page covers the code that uses them, in three phases. Each phase ships on its
own and leaves the app working; you can stop between them.

## Why Implicit Async Is Hard To Migrate

With the legacy kinds, reading an async relationship is a side effect: the first access starts a
request (fetch-on-access, or "autofetch"), and the value is a proxy that fills in later. A `PromiseManyArray` iterates as empty until
its contents arrive, so an `#each` over `post.comments` renders nothing, then everything. A
`PromiseBelongsTo` proxies the record, so `post.author.content` (or `post.author` in a template)
reads as `null` and later as the author. Getters and computed properties built on these chains
"work" because each level re-computes when the level above resolves.

Nothing in that code owns the loading state, and a chain three levels deep has three separate
requests that nobody wrote. The `resource` and `collection` kinds remove both the proxy and the
fetch, so each of these sites needs an explicit owner of its async boundary before the field can
change. Phase 1 adds that owner while the legacy field, and its autofetch safety net, are still in
place.

## Phase 1: Make Each Async Boundary Explicit

Stay on the legacy fields for this phase. Both tools below accept the legacy proxies directly, and
accessing the relationship still triggers its fetch; you are only changing who handles the
resulting promise.

### In templates, use `<Await />`

Before:

```hbs
<ul>
  {{#each @post.comments as |comment|}}
    <li>{{comment.author.name}}: {{comment.body}}</li>
  {{/each}}
</ul>
```

After:

```gts
import { Await } from '@warp-drive/ember';

<template>
  <Await @promise={{@post.comments}}>
    <:pending><Spinner /></:pending>
    <:error as |error|><ErrorMessage @error={{error}} /></:error>
    <:success as |comments|>
      <ul>
        {{#each comments as |comment|}}
          <li><CommentLine @comment={{comment}} /></li>
        {{/each}}
      </ul>
    </:success>
  </Await>
</template>
```

`:success` yields the resolved value, here the `ManyArray`. Every level of the old chain becomes
its own `<Await />`. Rather than nesting them in one template, pass the inner relationship down
and let a child component await it; `CommentLine` does that for the `belongsTo`:

```gts
import { Await } from '@warp-drive/ember';

<template>
  <Await @promise={{@comment.author}}>
    <:pending>…</:pending>
    <:error as |error|><ErrorMessage @error={{error}} /></:error>
    <:success as |author|>{{author.name}}: {{@comment.body}}</:success>
  </Await>
</template>
```

The [Passing Promises as Args](/guides/the-manual/reactivity/derivation.md#passing-promises-as-args)
section of the reactivity guide explains why this shape composes well. Provide an `:error` block:
without one a rejected promise is rethrown.

### In getters and computed properties, use `getPromiseState`

Before:

```ts
get companyName() {
  const author = this.args.post.author.content;  // null until the proxy resolves
  const company = author?.company.content;       // and again one level down
  return company?.name;
}
```

After:

```ts
import { getPromiseState } from '@warp-drive/ember';

get authorState() {
  return getPromiseState(this.args.post.author);
}

get companyState() {
  const author = this.authorState.value;
  return author ? getPromiseState(author.company) : null;
}

get companyName() {
  return this.companyState?.value?.name ?? null;
}
```

Each level now exposes `isPending`, `isSuccess`, `isError`, `value` and `reason`, so the template
can render a loading or error state for it instead of a blank. While the author is still pending,
`companyState` is `null` because there is no company promise yet, so "the name is loading" is
`authorState.isPending || companyState?.isPending`. `getPromiseState` memoizes per
promise, and the proxies are stable per record, so the getters stay cheap. Replace `@computed`
dependent-key chains with plain getters; the reactive reads inside them are what make them
recompute. [Async as Reactive State](/guides/the-manual/reactivity/derivation.md#reading-data)
covers the technique in depth.

### Last resort: read the reference's `value()`

Some sites are neither a template nor a getter you can restructure: a plain utility function deep
in a call chain, code that must stay synchronous, a computed property with many consumers. For
those, read the loaded value synchronously through the relationship reference:

```ts
const comments = post.hasMany('comments').value();  // ManyArray | null
const author = post.belongsTo('author').value();    // User | null
```

`value()` never fetches. It returns `null` until the relationship is loaded, and for `hasMany`
until *every* member is loaded, so pair it with an explicit load where the screen begins:
`await post.hasMany('comments').load()` is a no-op when the data is already present.

Treat this as the fallback when the two refactors above are not clean, not as the default. It hides
the async boundary again; for a `belongsTo`, `null` now means both "empty" and "not loaded yet"
(a loaded but empty `hasMany` is an empty `ManyArray`, not `null`); and it is exactly the shape
Phase 3 removes. Do not reach for `record.belongsTo('x').id()` or
`record.hasMany('x').ids()` to avoid loading the members; that pattern has
[no migration path](./relationships.md#patterns-without-a-migration-path).

## Phase 2: Load Through Requests

The next step is to stop loading relationships ad hoc. The request that renders a screen should
bring the relationships that screen needs, so that by the time a component reads one, it is
already in the cache and the async boundary sits at the request, not at the relationship.

**Include the relationship in the parent's request.** With a request builder such as
[`findRecord`](/api/@warp-drive/utilities/json-api/functions/findRecord) from
`@warp-drive/utilities/json-api`, ask for the relationships along with the parent and render inside
a `<Request />`:

```gts
import { Request } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';

<template>
  <Request @query={{findRecord "post" @id (hash include=(array "comments" "comments.author"))}}>
    <:loading><Spinner /></:loading>
    <:error as |error state|><ErrorMessage @error={{error}} @retry={{state.retry}} /></:error>
    <:content as |result|>
      <PostView @post={{result.data}} />
    </:content>
  </Request>
</template>
```

Inside `:content` the comments and their authors are loaded. The Phase 1 `<Await />` and
`getPromiseState` sites resolve synchronously on first render, and any `value()` fallback returns
the value. Leave them in place while any request can still deliver the parent without the
relationship. Once *every* request that loads posts includes `comments`, the field is in practice
a sync relationship: change it to `async: false` and delete its Phase 1 shims, because the value
is now the `ManyArray` itself. If the app has moved its requests off adapters and serializers, add
`linksMode: true` at the same time so the relationship's link, when present, is fetched through
`store.request`; [LinksMode](/guides/the-manual/misc/links-mode.md) explains the option.

**Request the link when the relationship is loaded on demand.** For a relationship the parent's
request should not include, and whose payload carries a `related` link, load the link with a
`<Request />` where it is rendered, instead of letting access fetch it:

```ts
get commentsQuery() {
  const url = this.args.post.hasMany('comments').link();
  return url ? { url, method: 'GET' as const } : null;
}
```

```hbs
<Request @query={{this.commentsQuery}}>
  <:content as |result|>{{#each result.data as |comment|}}...{{/each}}</:content>
</Request>
```

The request state gives you `reload` and `refresh` where you previously called
`post.hasMany('comments').reload()`. See
[Making Requests](/guides/the-manual/requests/index.md#reactive-control-flow) for the component and
its JavaScript equivalent, `getRequestState`.

At the end of this phase no template or getter depends on autofetch. The shims that remain sit on
fields that are still `async: true`: fields you load on demand through their link, and included
fields whose every request you have not yet audited. Phase 3 removes the second group.

## Phase 3: Move the Fields to `resource` and `collection`

Convert each field following
[Migrating Relationships to `resource` and `collection`](./relationships.md). With the boundaries
made explicit in Phase 1 and the loading moved into requests in Phase 2, the code change is small:

**Included relationships become plain reads.** Wherever the parent's request includes the
relationship, read `post.comments.data` and `post.author.data` directly, and delete any `<Await />`,
`getPromiseState` or `value()` shim still standing for those fields. `data` is synchronous whenever
the members have been loaded, whether the field is `async: true` or `async: false`.

**On-demand relationships fetch their link.** The field stays `async: true`, which now means "has a
`related` link you fetch yourself":

```ts
import { cached } from '@glimmer/tracking';
import { getPromiseState } from '@warp-drive/ember';

@cached get commentsRequest() {
  return this.args.post.comments.fetch();
}

get commentsState() {
  return getPromiseState(this.commentsRequest);
}
```

`fetch()` requests `links.related`, writes the comments the response returns into the
relationship, and resolves with the relationship document itself, so `commentsState.value` is
`post.comments`. Once it settles, read the comments from `post.comments.data`; use
`commentsState` only for the loading and error branches. The `<Request />` form from Phase 2 works
unchanged with `post.comments.links.related` as the URL, and is the better choice when you want
retry, refresh and cancellation handled for you.

**Finish flipping included fields to `async: false`.** Any relationship that every request now
includes and that Phase 2 left `async: true` is a sync relationship. Declare it `async: false` so
the [JSON:API validator](/guides/the-manual/relational-data/spec.md#_3-4-enforcement) can hold
the API to that contract, and remove the loading branches that guarded it.

## Summary

| Site today | Phase 1 | Phase 2 | Phase 3 |
| --- | --- | --- | --- |
| `#each` over `post.comments` | `<Await>` over `post.comments` | rendered inside the parent's `<Request>`, which includes `comments`; shim deleted once the field is `async: false` | `#each` over `post.comments.data` |
| `post.author.content.name` in a getter | `getPromiseState(post.author).value?.name` | resolved synchronously; deleted once the field is `async: false` | `post.author.data?.name` |
| chain three levels deep | one `getPromiseState` or child `<Await>` per level | one `include` path covering the chain | plain `.data` reads |
| sync utility reading `post.comments` | `post.hasMany('comments').value()` plus an explicit `load()` | `value()` always returns the value; `post.comments` itself once `async: false` | `post.comments.data` |
| relationship loaded on demand | `<Await>` over the proxy | `<Request>` over `hasMany('comments').link()` | `<Request>` over `post.comments.links.related`, or `getPromiseState(post.comments.fetch())` |
| `post.hasMany('comments').reload()` | unchanged | `state.reload()` on the request that loaded it | `post.comments.fetch()` for a relationship loaded through its link; otherwise re-run the request that loaded it (`reload()` on its state) |
