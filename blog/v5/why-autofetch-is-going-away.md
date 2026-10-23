---
title: Why Autofetch Is Going Away, and How to Deal With That
description: Learn why WarpDrive is removing the fetch-on-access behavior of async belongsTo and hasMany relationships, what replaces it, and how to migrate an app one step at a time.
date: 2026-10-02
outline:
  level: 2,3
---

# Why Autofetch Is Going Away, and How to Deal With That

<SinceBadge version="5.10.0" /> &nbsp; 2026-10-02

**Who this is for:** apps that define `belongsTo` or `hasMany` relationships with `async: true`
(or with no `async` option, which used to default to `true`) on a `Model` or a
[LegacyMode](/guides/the-manual/schemas/resources/legacy-mode.md) schema, and anyone who has
noticed that [PolarisMode](/guides/the-manual/schemas/resources/polaris-mode.md) relationships
never autofetch and wondered why. It assumes you know how async relationships behave today.

:::info Where things stand, as of 5.10
- **Autofetch still works** on `Model` and LegacyMode, and no deprecation fires for it yet.
- **It will be deprecated** once its replacement, the `resource` and `collection` field kinds
  described below, ships in a release, and removed only in a later major version.
- **The migration steps in this post work today.** Step 1 needs 5.4 or later. Step 2 needs 5.6
  or later, and 5.8 for `useLegacyStore`. Step 3 waits for `resource` and `collection`.
:::

Reading an async relationship in ***Warp*Drive**, and in EmberData before it, does two things at
once: it returns a promise proxy for the related records, and if any of them aren't loaded, it
starts a request for them. That second half is **autofetch**, and it is going away. The
relationship itself isn't: `async` survives with a narrower meaning, and loading related data
becomes something your code asks for instead of something reading a property does.

## What Autofetch Does

Take a post with comments, where each comment has an author:

```ts
class Post extends Model {
  @hasMany('comment', { async: true, inverse: 'post' }) comments;
}

class Comment extends Model {
  @attr body;
  @belongsTo('user', { async: true, inverse: null }) author;
}
```

```hbs
{{#each @post.comments as |comment|}}
  <p>{{comment.author.name}}: {{comment.body}}</p>
{{/each}}
```

Nothing in that template looks like a request, but rendering it can make many:

1. Reading `@post.comments` returns a `PromiseManyArray` and fetches every comment that isn't in
   the cache: one request by the relationship's link, or one request per comment (one in total
   if the adapter coalesces them).
2. The `#each` renders nothing until those arrive, then renders everything.
3. Each `comment.author` returns a `PromiseBelongsTo` and fetches its author: another request per
   comment, which can only start after step 1 finishes, because only then does rendering reach
   it.

That is a request waterfall and an N+1 query, written by nobody, decided by whichever template
happened to render first.

## Why It Seemed Like a Good Idea

Async relationships come from a time when, as
[RFC 846](https://rfcs.emberjs.com/id/0846-ember-data-deprecate-proxies/) put it, "Native
Proxies did not yet exist, Promises were relatively unheard of, and async state management was
the Wild West." Templates could render a promise proxy without any ceremony, so a relationship
that fetched itself made lazy loading free. Edward Faulkner made the best case for it:

> When you're just starting out, they're really convenient. They let you traverse the graph of
> models lazily, on-demand and not need to stop and worry about it. […] As soon as people go beyond
> the basic cases, there's a cliff you step off and the asynchrony is more painful than helpful.
>
> — [ef4 on Ember Discuss, 2019-06-18](https://discuss.emberjs.com/t/what-are-the-benefits-of-async-relationship/16688/3)

Leaving autofetch behind does cost something: you have to decide up front which data each page
loads, and say so in code. The rest of this post argues that the decision was always being made,
just by accident.

## What It Cost

### Reading Data Became a Network Side Effect

One property read means two different things. Ryan Toronto, in EmberMap's
[The case against async relationships](https://embermap.com/notes/83-the-case-against-async-relationships)
(2017):

> Our main gripe with this API is that it combines the concerns of local data access with remote
> data fetching into a single method call. This makes it harder for developers to write
> expressive, intention-revealing code[.]

Is `post.comments` reading comments a route already loaded, starting a request, or refreshing in
the background? The code can't say. And because templates and getters are just property reads,
any of them can quietly become a data loader.

### Requests Nobody Wrote

The template decides when relationships are read, so it also decides what gets fetched and in
what order. Users found out from their network tab: "that category has 112 products in it. […]
it's going to trigger 113 xhr's"
([Ember Discuss, 2017](https://discuss.emberjs.com/t/ember-data-and-json-api-why-handle-relationships-client-side/12675/1)).
Even rendering `invoice.payer.id`, an id the client already had, fetched the whole payer, 50
requests for a table of 50 invoices, because EmberData "never has a chance to detect that you are
only attempting to access a property that is already loaded"
([#2705](https://github.com/warp-drive-data/warp-drive/issues/2705#issuecomment-70269202)).
`coalesceFindRequests` could fold some requests together when the adapter and server supported it,
but it was off by default and broke whenever URL building was customized.

Fetching on render also means nothing starts until rendering gets there, which is fatal for
server-side rendering: relationships "don't actually start loading until you try to render them,
and fastboot has no reason to know to wait for that to finish"
([ef4, 2018](https://discuss.emberjs.com/t/my-second-order-relationships-are-not-rendered-by-fastboot/15579/2)).

### Nothing Owns the Loading State

When a property read starts a request, no code owns that request, so nothing has a natural place
to show a spinner, handle an error, or retry. Templates flash empty, then full. A failed fetch
could be remembered, so reading the relationship again returned the same rejected promise
instead of retrying ([#5046](https://github.com/warp-drive-data/warp-drive/issues/5046)). Apps
read `isFulfilled` inside computed properties just to make them recompute
([#7904](https://github.com/warp-drive-data/warp-drive/issues/7904)).

### "Not Loaded" Looks Like "Empty"

An async relationship always hands back a proxy, loaded or not. A belongsTo "is going to return a
special promise, which of course will never be null"
([Ember Discuss, 2022](https://discuss.emberjs.com/t/detect-if-belongsto-is-null-and-toggle-associations/19702/2)).
Saving a record whose async hasMany had never loaded could serialize it as `[]` and wipe the
relationship on the server ([#2750](https://github.com/warp-drive-data/warp-drive/issues/2750)).

### The Proxy Exists Because of Autofetch

A value that might still be on its way can't be the record itself, so autofetch needs a stand-in,
and the stand-in leaks:

- It is never `===` to the record it wraps, so components comparing values miss changes
  ([#5575](https://github.com/warp-drive-data/warp-drive/issues/5575)).
- An `#if` on `this.book.authors` is always true, because the proxy is always there
  ([#8847](https://github.com/warp-drive-data/warp-drive/issues/8847)).
- TypeScript can't describe it: "typescript makes it impossible to have an async getter with a
  sync setter" ([#8817](https://github.com/warp-drive-data/warp-drive/issues/8817#issuecomment-1703088270)).

5.0 removed the Ember proxy machinery, but as long as reading a relationship can start a request,
it has to return something promise-shaped.

### The Community Was Already Turning It Off

By 2017 experienced teams were opting out. EmberMap's
[ember-data-storefront](https://github.com/embermap/ember-data-storefront) made every relationship
`async: false` and gave apps an explicit `load()` instead, and their article concluded:

> Async relationships end up being a footgun for beginners: they make it easy to write n + 1 bugs,
> and they make data loading seem like a smaller piece of Ember app development than it actually
> is.

Going sync had its own trap: a sync relationship whose data wasn't in the payload looked empty.
Ryan Toronto described the real answer in 2019: links plus sync relationships "let you access data
without triggering network requests, but also let you lazily load data when you need it"
([Ember Discuss](https://discuss.emberjs.com/t/ember-data-jsonapi-and-known-to-be-empty-relationships-that-are-definitely-not-empty/16219/6)).
That is the design ***Warp*Drive** is landing on.

## What's Changing

Autofetch is being retired in stages, and the early ones have shipped:

- **Promise proxy behaviors were deprecated** by RFCs
  [745](https://rfcs.emberjs.com/id/0745-ember-data-deprecate-methods-on-promise-many-array/) and
  [846](https://rfcs.emberjs.com/id/0846-ember-data-deprecate-proxies/) and removed in 5.0. The
  async belongsTo proxy was left as-is on purpose, because "encouraging folks to refactor towards
  `await` before use is key for the next stage in which async relationships will not exist at all
  in their current form."
- **The legacy request paths were deprecated** by
  [RFC 964](https://rfcs.emberjs.com/id/0964-deprecate-legacy-request-support/), which lists "the
  `hasMany` and `belongsTo` async auto-fetch behaviors" among them. It holds off on deprecating
  adapters until autofetch can go too, "only once replacements are firmly in place."
- **PolarisMode never had autofetch.** Its relationships use
  [LinksMode](/guides/the-manual/misc/links-mode.md), which loads a relationship through the
  request pipeline instead of an adapter, and only when asked.

The replacement is two new relationship field kinds, `resource` and `collection`, which take over
from `belongsTo` and `hasMany`. They are being built now and are not in a release yet. They keep
the `async` option but change what it means:

- An `async` relationship is one that **can be fetched on its own**, because it has a link. Its
  value is an object with `data`, `links` and `meta`, like the
  [ReactiveDocument](/api/@warp-drive/core/reactive/types/ReactiveDocument) a request returns.
  `data` holds whatever the cache has, and is empty until the relationship is loaded. Reading it
  never makes a request; loading it is an explicit call.
- A sync relationship is one whose data **always arrives with its parent** and is never fetched
  separately.

So `async` stops being a behavior of the UI, something that happens when a template reads a
property, and becomes a fact about the data: whether your API serves that relationship
separately. The plan dates back to 2019, when runspired described relationships needing
"information about meta/errors/links beyond just the records that they contain," with apps
opting in "by changing from belongsTo and hasMany to resource and collection decorators"
([Ember Discuss](https://discuss.emberjs.com/t/what-are-the-benefits-of-async-relationship/16688/7)).

## How to Deal With It

None of this has to happen at once, and none of it requires leaving `Model` first. Moving off
adapters to requests, moving off models to schemas, and moving off autofetch are separate
changes; you can make them in any order. The steps below work on `Model` and LegacyMode, one
relationship at a time, and each one leaves your app working.

### Step 1: Make Every Async Read Explicit

Keep `async: true` for now, but stop relying on the proxy. Wherever a template renders an async
relationship, render it through [`<Await>`](/api/@warp-drive/ember/classes/Await), from
`@warp-drive/ember`, which gives the pending and error states a home:

```glimmer-ts
// app/components/post-comments.gts
import { Await } from '@warp-drive/ember';
import Comment from './comment';

<template>
  <Await @promise={{@post.comments}}>
    <:pending>Loading comments…</:pending>
    <:error as |error|>Couldn't load comments: {{error.message}}</:error>
    <:success as |comments|>
      {{#each comments as |comment|}}
        <Comment @comment={{comment}} />
      {{/each}}
    </:success>
  </Await>
</template>
```

Give each level its own `<Await>`: here the `Comment` component would await `@comment.author`
itself, instead of chaining `comment.author.name` through two proxies. In JavaScript, `await` the relationship before using it, or derive its state with
[`getPromiseState`](/api/@warp-drive/core/reactive/functions/getPromiseState) in a getter instead
of reading `isPending` or `.content`.
[Async as Reactive State](/guides/the-manual/reactivity/derivation.md) covers both patterns.

The app still autofetches after this step, but every place that does is now visible, handles
loading and failure, and no longer depends on proxy behavior.

### Step 2: Load Relationships Through Requests

Next, decide where each relationship's data should come from, and fetch it there on purpose.
Data a page needs up front belongs in the request that loads the page, using `include`:

```ts
// app/routes/post.ts
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { findRecord } from '@warp-drive/utilities/json-api';

export default class PostRoute extends Route {
  @service store;

  async model({ post_id }) {
    const { content } = await this.store.request(
      findRecord('post', post_id, { include: ['comments', 'comments.author'] })
    );
    return content.data; // the post, with its comments and their authors in the cache
  }
}
```

You can also render a request in a component with [`<Request>`](/api/@warp-drive/ember/classes/Request)
instead of awaiting it in a route. Identical requests are deduplicated, so a route can start a
request early and a component can render the same request later without fetching twice. That is
how you shape the waterfall on purpose: start the requests a page can't render without as early
as possible, and leave the rest to the components that need them.
[Making Requests](/guides/the-manual/requests/index.md) covers builders, `include` and `<Request>`.

Data you want only on demand, like comments behind a "Show comments" button, can be requested by
the relationship's link, which its reference exposes:

```glimmer-ts
// app/components/post-comments.gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { Request } from '@warp-drive/ember';
import Comment from './comment';

export default class PostComments extends Component {
  get commentsRequest() {
    const url = this.args.post.hasMany('comments').link();
    return url ? { url, method: 'GET' } : null;
  }

  <template>
    {{#if this.commentsRequest}}
      <Request @query={{this.commentsRequest}}>
        <:loading>Loading comments…</:loading>
        <:error as |error state|>
          Couldn't load comments.
          <button type="button" {{on "click" state.retry}}>Retry</button>
        </:error>
        <:content as |result|>
          {{#each result.data as |comment|}}
            <Comment @comment={{comment}} />
          {{/each}}
        </:content>
      </Request>
    {{/if}}
  </template>
}
```

`result.data` is the array of `Comment` records from the response. Render it directly: in current
releases, a response fetched this way doesn't update `post.comments`. Note that `<Request>` names
its blocks `loading` and `content`, while `<Await>` uses `pending` and `success`.

Once every request that loads a post either includes its comments or gives the relationship a
related link, the relationship no longer needs autofetch. Change its declaration:

```ts
@hasMany('comment', { async: false, inverse: 'post', linksMode: true }) comments;
```

(on a LegacyMode schema, set the same `options` on the field). Reading `post.comments` now returns
whatever the cache holds and never makes a request. If the relationship was only given a link and
never loaded, that is an empty array, so keep rendering on-demand relationships from their request
until `collection` makes "not loaded yet" visible. With LinksMode, development builds also check
every payload for the relationship and throw if it has neither a related link nor its full data,
so a missing `include` shows up as an error while you develop instead of an unexpected request in
production.

When every relationship is in LinksMode and nothing else uses an adapter,
`useLegacyStore({ linksMode: true, … })` sets up a store with no adapter or serializer layer at
all.

### Step 3: Move to `resource` and `collection`

When the new field kinds ship, a LinksMode relationship moves over with a schema change:
`belongsTo` becomes `resource`, `hasMany` becomes `collection`, and reads change from
`post.comments` to `post.comments.data`. Relationships you fetch on demand become `async` again,
in the new sense, and `post.comments.fetch()` loads them by their link and fills in `data`. A
migration guide will ship alongside them.

### What Isn't Solved Yet

Two patterns have no migration path today:

- **Relationships to records the payload never includes**, where the app expects to have loaded
  them some other way.
- **Reading ids without loading records**, as `post.hasMany('comments').ids()` and
  `post.belongsTo('author').id()` allow.

Keep those on `belongsTo` and `hasMany` for now.
[RFC 0006](/rfcs/0006-pointer-and-reference-fields.md), still a proposal, introduces `pointer` and
`reference` field kinds for exactly these cases.

### If You Used ember-data-storefront

Storefront's ideas carry over almost one for one:

| ember-data-storefront | ***Warp*Drive** |
| --- | --- |
| `async: false` everywhere, enforced by lint | LinksMode relationships, then `resource` and `collection`; reading never fetches |
| `store.loadRecords` / `loadRecord` with include-aware caching | Requests with `include`, cached per request |
| `model.load('comments')` | `<Request>` on the relationship's link today; `fetch()` on `resource` and `collection` |
| the `assert-must-preload` component | LinksMode's payload checks in development builds |
| data-provider components | `<Request>` and `<Await>` |

## Further Reading

- [Async as Reactive State](/guides/the-manual/reactivity/derivation.md): `getPromiseState` and
  `<Await>`.
- [Making Requests](/guides/the-manual/requests/index.md): `<Request>`, builders and `include`.
- [LinksMode](/guides/the-manual/misc/links-mode.md): requirements and behavior.
- [Incremental adoption](/upgrading/v5/incremental-adoption.md) and the
  [two-store migration](/upgrading/v5/two-store-migration.md), for apps that lean heavily on
  proxies.
- [The case against async relationships](https://embermap.com/notes/83-the-case-against-async-relationships),
  EmberMap, 2017.
