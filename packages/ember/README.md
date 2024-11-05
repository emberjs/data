<p align="center">
  <img
    class="project-logo"
    src="./NCC-1701-a-blue.svg#gh-light-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
  <img
    class="project-logo"
    src="./NCC-1701-a.svg#gh-dark-mode-only"
    alt="WarpDrive"
    width="120px"
    title="WarpDrive" />
</p>

<h3 align="center">:electron: Data utilities for using <em style="color: lightgreen">Warp</em><strong style="color: magenta">Drive</strong> with 🐹 <em style="color: orange">Ember</em><em style="color: lightblue">.js</em></h3>
<h4 align="center">And of course, <em style="color: orange">Ember</em><strong style="color: lightblue">Data</strong> too! </h4>

---

```cli
pnpm install @warp-drive/ember
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40warp-drive%2Fember/canary?label=@canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40warp-drive%2Fember/bet?label=@beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40warp-drive%2Fember/latest?label=@latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40warp-drive%2Fember/lts?label=@lts&color=0096FF)
- ![NPM LTS-4-12 Version](https://img.shields.io/npm/v/%40warp-drive%2Fember/lts-4-12?label=@lts-4-12&color=bbbbbb)

## About

This library provides reactive utilities for working with promises and requests, building over these primitives to provide functions and components that enable you to build robust performant apps with elegant control flow

Documentation

- [PromiseState](#promisestate)
  - [getPromiseState](#getpromisestate)
  - [\<Await />](#await-)
- [RequestState](#requeststate)
  - [getRequestState](#getrequeststate)
  - [\<Request />](#request-)
- [PaginationState](#paginationstate)
  - [getPaginationState](#getpaginationstate)
  - [\<Paginate />](#paginate-)

---

## Why?

### DX

Crafting a performant application experience is a creative art.

The data loading patterns that make for good DX are often at odds with the patterns that reduce fetch-waterfalls and loading times.

Fetching data from components *feels* right to most of us as developers. Being able to see
what we've queried right from the spot in which we will consume and use the response of the
query keeps the mental model clear and helps us iterate quickly.

But it also means that we have to render in order to know what to fetch, in order to know what to render, in order to know what to fetch and so on until the cycle eventually completes.

Thus, while on the surface providing superior DX, component based data-fetching patterns 
sacrifice the  user's experience for the developer's by encouraging a difficult-to-impossible 
to optimize loading architecture.

It can also be tricky to pull off elegantly. Async/Await? Proxies? Resources? Generators? 
Each has its own pitfalls when it comes to asynchronous data patterns in components and
crafting an experience that works well for both JavaScript and Templates is tough. And what 
about work lifetimes?

This library helps you to craft great experiences without sacrificing DX. We still believe
you should load data based on user interactions and route navigations, not from components,
but what if you didn't need to use prop-drilling or contexts to access the result of a
route based query?

EmberData's RequestManager already allows for fulfillment from cache and for request 
de-duping, so what if we could just pick up where we left off and use the result of a
request right away if it already was fetched elsewhere?

That brings us to our second motivation: performance.

### Performance

Performance is always at the heart of WarpDrive libraries.

`@warp-drive/ember` isn't just a library of utilities for working with reactive
asynchronous data in your Ember app. It is *also* a way to optimize your app for
faster, more correct renders.

It starts with `setPromiseResult` a simple core primitive provided by the library
`@ember-data/request` that allows the result of any promise to be safely cached
without leaking memory. Results stashed with `setPromiseResult` can then be retrieved
via `getPromiseResult`. As long as the promise is in memory, the result will be too.

Every request made with `@ember-data/request` stashes its result in this way, and
the requests resolved from cache by the CacheHandler have their entry populated
syncronously. Consider the following code:

```ts
const A = store.request({ url: '/users/1' });
const result = await A;
result.content.data.id; // '1'
const B = store.request({ url: '/user/1' });
```

The above scenario is relatively common when a route, provider or previous location
in an app has loaded request A, and later something else triggers request B.

While it is true that `A !== B`, the magic of the RequestManager is that it is able
to safely stash the result of B such that the following works:

```ts
const B = store.request({ url: '/user/1' });
const state = getPromiseResult(B);
state.result.content.data.id; // '1' 🤯
```

Note how we can access the result of B even before we've awaited it? This is useful
for component rendering where we want to fetch data asynchronously, but when it is
immediately available the best possible result is to continue to render with the available
data without delay.

These primitives (`getPromiseResult` and `setPromiseResult`) are useful, but not all
that ergonomic on their own. They are also intentionally not reactive because they
are intended for use with *any* framework.

That's where `@warp-drive/ember` comes in. This library provides reactive utilities
for working with promises, building over these primitives to provide helpers, functions
 and components that enable you to build robust performant app with elegant control flows.

---

## Documentation

### PromiseState

PromiseState provides a reactive wrapper for a promise which allows you write declarative
code around a promise's control flow. It is useful in both Template and JavaScript contexts,
allowing you to quickly derive behaviors and data from pending, error and success states.

```ts
interface PromiseState<T = unknown, E = unknown> {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  result: T | null;
  error: E | null;
}
```

To get the state of a promise, use `getPromiseState`.

### getPromiseState

`getPromiseState` can be used in both JavaScript and Template contexts.

```ts
import { getPromiseState } from '@warp-drive/ember';

const state = getPromiseState(promise);
```

For instance, we could write a getter on a component that updates whenever
the promise state advances or the promise changes, by combining the function
with the use of `@cached`

```ts
class Component {
  @cached
  get title() {
    const state = getPromiseState(this.args.request);
    if (state.isPending) {
      return 'loading...';
    }
    if (state.isError) { return null; }
    return state.result.title;
  }
}
```

Or in a template as a helper:

```gjs
import { getPromiseState } from '@warp-drive/ember';

<template>
  {{#let (getPromiseState @request) as |state|}}
    {{#if state.isPending}} <Spinner />
    {{else if state.isError}} <ErrorForm @error={{state.error}} />
    {{else}}
      <h1>{{state.result.title}}</h1>
    {{/if}}
  {{/let}}
</template>
```

#### \<Await />

Alternatively, use the `<Await>` component

```gjs
import { Await } from '@warp-drive/ember';

<template>
  <Await @promise={{@request}}>
    <:pending>
      <Spinner />
    </:pending>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:success as |result|>
      <h1>{{result.title}}</h1>
    </:success>
  </Await>
</template>
```

When using the Await component, if no error block is provided and the promise rejects,
the error will be thrown.

### RequestState

RequestState extends PromiseState to provide a reactive wrapper for a request `Future` which
allows you write declarative code around a Future's control flow. It is useful in both Template 
and JavaScript contexts, allowing you to quickly derive behaviors and data from pending, error 
and success states.

The key difference between a Promise and a Future is that Futures provide access to a stream
of their content, as well as the ability to attempt to abort the request.

```ts
interface Future<T> extends Promise<T>> {
  getStream(): Promise<ReadableStream>;
  abort(): void;
}
```

These additional APIs allow us to craft even richer state experiences.


```ts
interface RequestState<T = unknown, E = unknown> extends PromiseState<T, E> {
  isCancelled: boolean;
  
  // TODO detail out percentage props
}
```

To get the state of a request, use `getRequestState`.

### getRequestState

`getRequestState` can be used in both JavaScript and Template contexts.

```ts
import { getRequestState } from '@warp-drive/ember';

const state = getRequestState(future);
```

For instance, we could write a getter on a component that updates whenever
the request state advances or the future changes, by combining the function
with the use of `@cached`

```ts
class Component {
  @cached
  get title() {
    const state = getRequestState(this.args.request);
    if (state.isPending) {
      return 'loading...';
    }
    if (state.isError) { return null; }
    return state.result.title;
  }
}
```

Or in a template as a helper:

```gjs
import { getRequestState } from '@warp-drive/ember';

<template>
  {{#let (getRequestState @request) as |state|}}
    {{#if state.isPending}} <Spinner />
    {{else if state.isError}} <ErrorForm @error={{state.error}} />
    {{else}}
      <h1>{{state.result.title}}</h1>
    {{/if}}
  {{/let}}
</template>
```

### \<Request />

To make working with requests in templates even easier, you can use
the `<Request>` component.

The `<Request />` component is *layout-less*. It is pure declarative control
flow with built-in state management utilities, and is designed to seamlessly
integrate with preferred patterns for loading data for routes and modals.

`<Request />` taps into additional capabilities *beyond*
what `RequestState` offers.

#### Completion states and an abort function are available as part of loading state

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:loading as |state|>
      <Spinner @percentDone={{state.completedRatio}} />
      <button {{on "click" state.abort}}>Cancel</button>
    </:loading>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:content as |result|>
      <h1>{{result.title}}</h1>
    </:content>
  </Request>
</template>
```

When using the Await component, if no error block is provided and the request rejects,
the error will be thrown. Cancellation errors are not rethrown if no error block or
cancellation block is present.

#### Streaming Data

The loading state exposes the download `ReadableStream` instance for consumption

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:loading as |state|>
      <Video @stream={{state.stream}} />
    </:loading>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>
  </Request>
</template>
```

#### Cancelled is an additional state.

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:cancelled>
      <h2>The Request Cancelled</h2>
    </:cancelled>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:content as |result|>
      <h1>{{result.title}}</h1>
    </:content>
  </Request>
</template>
```

If a request is aborted but no cancelled block is present, the error will be given
to the error block to handle.

If no error block is present, the cancellation error will be swallowed.

#### Idle is an additional state.

The `<:idle>` state occurs when the request or query passed to the component
is `undefined` or `null`.

```gjs
import { Request } from '@warp-drive/ember';


<template>
  <Request @request={{@request}}>
    <:idle><button {{on "click" @makeRequest}}>Load Preview?</button></:idle>
  </Request>
</template>
```

`<:idle>` states allows us to avoid wrapping `<Request />` components in `{{#if}}` blocks
when the request isn't ready to be made. E.g. No need do to this:

```gjs
import { Request } from '@warp-drive/ember';

<template>
  {{#if @request}}
    <Request @request={{@request}}>
  
    </Request>
  {{else}}
    <button {{on "click" @makeRequest}}>Load Preview?</button>
  {{/if}}
</template>
```

> [!IMPORTANT]
> `null` and `undefined` are only valid arguments to `<Request />` if an `<:idle>` block is provided.

An important note is that `<:idle>` is effectively a special-cased error state. If no idle block is
provided, the component *will* throw an error if the argument is `null` or `undefined`.

#### retry

Cancelled and error'd requests may be retried,
retry will reuse the error, cancelled and loading
blocks as appropriate.

```gjs
import { Request } from '@warp-drive/ember';
import { on } from '@ember/modifier';

<template>
  <Request @request={{@request}}>
    <:cancelled as |error state|>
      <h2>The Request Cancelled</h2>
      <button {{on "click" state.retry}}>Retry</button>
    </:cancelled>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>

    <:content as |result|>
      <h1>{{result.title}}</h1>
    </:content>
  </Request>
</template>
```

#### Reloading states

Reload will reset the request state, and so reuse the error, cancelled, and loading
blocks as appropriate.

Background reload (refresh) is a special substate of `content` that can be entered while
existing content is still shown.

Both reload and background reload are available as methods that can be invoked from
within `content`. Background reload's can also be aborted.

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:cancelled>
      <h2>The Request Cancelled</h2>
    </:cancelled>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:content as |result state|>
      {{#if state.isBackgroundReloading}}
        <SmallSpinner />
        <button {{on "click" state.abort}}>Cancel</button>
      {{/if}}

      <h1>{{result.title}}</h1>

      <button {{on "click" state.refresh}}>Refresh</button>
      <button {{on "click" state.reload}}>Reload</button>
    </:content>
  </Request>
</template>
```

Usage of request can be nested for more advanced handling of background reload

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:cancelled>
      <h2>The Request Cancelled</h2>
    </:cancelled>

    <:error as |error|>
      <ErrorForm @error={{error}} />
    </:error>

    <:content as |result state|>
      <Request @request={{state.latestRequest}}>
        <!-- Handle Background Request -->
      </Request>
      
      <h1>{{result.title}}</h1>

      <button {{on "click" state.refresh}}>Refresh</button>
    </:content>
  </Request>
</template>
```

#### Autorefresh behavior

Requests can be made to automatically refresh under any combination of three separate conditions
by supplying a value to the `@autorefresh` arg.

- `online` when a browser window or tab comes back to the foreground after being backgrounded
or when the network reports as being online after having been offline.
- `interval` which occurs whenever `@autorefreshThreshold` has been exceeded
- `invalid` which occurs when the store associated to the request emits an invalidation notification for the request in use.

These conditions can be used in any combination by providing a comma separated list e.g.
`interval,invalid`

A value of `true` is equivalent to `online,invalid`.

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}} @autorefresh={{true}}>
    <!-- ... -->
  </Request>
</template>
```

By default, an autorefresh will only occur if the browser was backgrounded or offline for more than
30s before coming back available. This amount of time can be tweaked by setting the number of milliseconds
via `@autorefreshThreshold`.

The behavior of the fetch initiated by the autorefresh can also be adjusted by `@autorefreshBehavior`

Options are:

- `refresh` update while continuing to show the current state.
- `reload` update and show the loading state until update completes)
- `policy` (**default**) trigger the request, but let the cache handler decide whether the update should occur or if the cache is still valid.

---

Similarly, refresh could be set up on a timer or on a websocket subscription by using the yielded
refresh function and passing it to another component.

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:content as |result state|>
      <h1>{{result.title}}</h1>

      <Interval @period={{30_000}} @fn={{state.refresh}} />
      <Subscribe @channel={{@someValue}} @fn={{state.refresh}} />
    </:content>
  </Request>
</template>
```

If a matching request is refreshed or reloaded by any other component, the `Request` component will react accordingly.

---

### PaginationState

### getPaginationState

### \<Paginate />

The `<Paginate />` component is *layout-less*. Just like `<Request />`, it is pure
declarative control flow with built-in state management utilities.

`<Paginate />` works *because* it understands pagination links.

> [!Tip]
> Pagination links are a feature of WarpDrive/EmberData response documents. If your API does
> not generate pagination links, you may want consider using a handler to process API responses
> for paginated queries that generates pagination links for you. This is useful to do 
> *even if you do not use `<Paginate />`* as quite a few WarpDrive/EmberData features work best
> with links.

`<Paginate />`'s API mimics `<Request />`, but expands the possibilities to afford an extremely
flexible toolbox for managing the state of any paginated flow we want to build.

All of the same top-level states (`idle` `loading` `content` `pending` `error` `cancelled`) are
available to us for use. `idle`, `loading`, `error` and `cancelled` apply only to the state of
the initiating request passed into the component.

The `content` block is entered when the initial request resolves, and yields a `pages` object
that exposes information about all pages.

Three new blocks are added:
- `<:prev as |request|>`, which is active while a request for a previous link is being performed
- `<:next as |request|>`, which is active while a request for a next link is being performed
- `<:default>`, which allows use of `Paginate` without any other blocks.

> [!TIP]
> If the `<:default>` block is provided, no other named blocks will ever be utilized. E.g. the use of
> default represents a separate mode for the component in which we have signaled that request state
> management will occur elsewhere

While the `<Paginate/>` component is *layout-less*, named blocks do have to render *somewhere* 😉

When multiple blocks are capable of being rendered at the same time that insertion order may matter.

We guarantee that blocks render into the DOM in the following order with zero wrapping elements.
So content placed in one block will be sibling to content placed in another block if both are rendered.

- prev
- content
- next

No other blocks are capable of being rendered simultaneously. It is possible for all three of these
blocks to be shown concurrently if both `prev` and `next` requests are triggered.

Below, we show a number of example usages.

#### Render an infinite list

Here we use `<Paginate />` together with [VerticalCollection](https://github.com/html-next/vertical-collection/)
to provide bidirectional infinite scroll.

**without error/loading states**

```gjs
import { Paginate } from '@warp-drive/ember';

<template>
  <Paginate @request={{@request}} as |pages|>
      <VerticalCollection
        @items={{pages.data}}
        @lastReached={{pages.next}}
        @firstReached={{pages.prev}}
        as |item|
      >
        {{item.title}}
      </VerticalCollection>
  </Paginate>
</template>
```

**With a loading state for the initial request**

```diff
  <Paginate @request={{@request}} as |pages|>
+   <:loading><Spinner /></:loading>
+
+   <:content as |pages|>
      <VerticalCollection
        @items={{pages.data}}
        @lastReached={{pages.next}}
        @firstReached={{pages.prev}}
        as |item|
      >
        {{item.title}}
      </VerticalCollection>
+   <:content>
  </Paginate>
```

**With an error state for errors on the initial request**

```diff
  <Paginate @request={{@request}} as |pages|>
    <:loading><Spinner /></:loading>

    <:content as |pages|>
      <VerticalCollection
        @items={{pages.data}}
        @lastReached={{pages.next}}
        @firstReached={{pages.prev}}
        as |item|
      >
        {{item.title}}
      </VerticalCollection>
    <:content>
+
+   <:error as |error state|>
+     <ErrorForm @error={{error}} />
+     <button {{on "click" state.retry}}>Retry</button>
+   </:error>
  </Paginate>
```

**Displaying a spinner when a subsequent request is loading**

```diff
  <Paginate @request={{@request}} as |pages|>
    <:loading><Spinner /></:loading>
+   
+   <:prev><Spinner /></:prev>

    <:content as |pages state|>
      <VerticalCollection
        @items={{pages.data}}
        @lastReached={{pages.next}}
        @firstReached={{pages.prev}}
        as |item|
      >
        {{item.title}}
      </VerticalCollection>
    <:content>
+
+   <:next><Spinner /></:loading>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
```

**Displaying errors from a subsequent request**

When an error occurs on `next` or `prev` requests,
the associated block remains active until the request
succeeds. This enables us to handle the full control
flow for the subsequent request by passing it into `<Request />`!

```diff
  <Paginate @request={{@request}} as |pages|>
    <:loading><Spinner /></:loading>
   
-   <:prev><Spinner /></:prev>
+   <:prev as |request|>
+     <Request @request={{request}}>
+       <:loading><Spinner /></:loading>
+
+       <:error as |error state|>
+         <ErrorForm @error={{error}} />
+         <button {{on "click" state.retry}}>Retry</button>
+       </:error>
+     </Request>
+   </:prev>

    <:content as |pages state|>
      <VerticalCollection
        @items={{pages.data}}
        @lastReached={{pages.next}}
        @firstReached={{pages.prev}}
        as |item|
      >
        {{item.title}}
      </VerticalCollection>
    <:content>

    <:next><Spinner /></:loading>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
```

**Advanced handling of Subsequent**

In some cases, utilizing the `prev` and `next` blocks might limit the desired UX.
When this happens, we can use the `prevRequest` and `nextRequest` properties
to compose more advanced handling behaviors.

```diff
 <Paginate @request={{@request}} as |pages|>
    <:loading><Spinner /></:loading>

    <:content as |pages state|>
+     <Request @request={{state.prevRequest}}>
+       <:loading><Spinner /></:loading>
+       <:idle><button {{on "click" pages.prev}}>Load More</button></:idle
+     </Request>

      <VerticalCollection
        @items={{pages.data}}
        @lastReached={{pages.next}}
        @firstReached={{pages.prev}}
        as |item|
      >
        {{item.title}}
      </VerticalCollection>

+     <Request @request={{state.nextRequest}}>
+       <:loading><Spinner /></:loading>
+       <:idle><button {{on "click" pages.next}}>Load More</button></:idle
+     </Request>
    <:content>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
```

#### Render Individual pages

The `<Paginate />` component works equally well for tab / link style pagination
UX as it does for InfiniteFeed style UX.

**Render the active page**

> [!TIP]
> Remember, the `<:loading>` and `<:error>` states apply only to the initial request,
> not to the activePage.

```gjs
import { Paginate } from '@warp-drive/ember';

<template>
  <Paginate @request={{@request}}>
    <:loading><Spinner /></:loading>

    <:content as |pages state|>
      <MyPageDisplay @page={{pages.activePage}} />
    <:content>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>
  </Paginate>
<template>
```

**Render Pagination Links**

`pages.links` exposes a `PaginationLinks` container with helpful utilities for creating
navigation links. A companion component makes rendering links quick to setup.

The `<EachLink/>` component renders each available link or placeholder. Placeholders
occur when it is known that a link *could* exist but we have not yet received the link.
The `text` property on the link will be a single `'.'` in these cases.

```diff
- import { Paginate } from '@warp-drive/ember';
+ import { Paginate, EachLink } from '@warp-drive/ember';

 <template>
   <Paginate @request={{@request}}>
     <:loading><Spinner /></:loading>

     <:content as |pages state|>
       <MyPageDisplay @page={{pages.activePage}} />
+
+      <EachLink @pages={{pages}}>
+        <:placeholder as |link|>{{link.text}}</:placeholder>
+        <:link as |link|>
+          <button {{on "click" link.setActive}}>{{link.index}}</button>
+        </:link>
+    </EachLink>
     <:content>

     <:error as |error state|>
       <ErrorForm @error={{error}} />
       <button {{on "click" state.retry}}>Retry</button>
     </:error>
   </Paginate>
 <template>
```

**Total Pages Hints**

The PaginationLinks container utilizes two hints for helping to manage the links collection: `currentPage` and `totalPages`.
We can provide these hints by passing in a `PageHints` function to the component. Whenever a request loads, the hint function
will be run.

```ts
interface PageHints {
  (result: ResourceCollectionDocument): { currentPage: number; totalPages: number; }
}
```

```hbs
<Paginate @request={{@request}} @pageHints={{@pageHintsFn}}>
```

> [!Tip]
> The `<Paginate />` component is agnostic to page size. If we would like to hint
> to something like `VerticalCollection` how many total items might conceivably be loaded,
> we can easily access that information from the response! For example, if we were
> Using the JSON:API Pagination Profiles Spec, the hint could come from
> `pages.activePage.meta.estimatedTotal.bestGuess`

**Substates for loading individual pages**

Often in a tabbed structure we will want individual loading states for the request for each
individual page. This is a scenario where using the `default` block comes in handy.

Below is the same example as above but with a loading state per-page.

In this case, the `activePageRequest` will start as the request for the first page,
and update as the user clicks through.

In addition to per-page control-flow, this gives us the ability to provide a stable ui-frame
and navigation experience that wraps these loading and error states.

```gjs
import { Paginate, EachLink } from '@warp-drive/ember';

<template>
  <Paginate @request={{@request}} as |pages state|>
    <Request @request={{pages.activePageRequest}}>
      <:loading><Spinner /></:loading>

      <:content as |page|>
        <MyPageDisplay @page={{page}} />
      </:content>

      <:error as |error state|>
        <ErrorForm @error={{error}} />
        <button {{on "click" state.retry}}>Retry</button>
      </:error>
    </Request>

    <EachLink @pages={{pages}}>
      <:placeholder as |link|>{{link.text}}</:placeholder>
      <:link as |link|>
        <button {{on "click" link.setActive}}>{{link.index}}</button>
      </:link>
    </EachLink>
  </Paginate>
 <template>
```

---

### ♥️ Credits

 <details>
   <summary>Brought to you with ♥️ love by <a href="https://emberjs.com" title="EmberJS">🐹 Ember</a></summary>

  <style type="text/css">
    img.project-logo {
       padding: 0 5em 1em 5em;
       width: 100px;
       border-bottom: 2px solid #0969da;
       margin: 0 auto;
       display: block;
     }
    details > summary {
      font-size: 1.1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details {
      font-size: 1rem;
    }
    details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #000;
      border-bottom: 3px solid #0969da;
    }

    details > details {
      margin-left: 2rem;
    }
    details > details > summary {
      font-size: 1rem;
      line-height: 1rem;
      margin-bottom: 1rem;
    }
    details > details > summary strong {
      display: inline-block;
      padding: .2rem 0;
      color: #555;
      border-bottom: 2px solid #555;
    }
    details > details {
      font-size: .85rem;
    }

    @media (prefers-color-scheme: dark) {
      details > summary strong {
        color: #fff;
      }
    }
    @media (prefers-color-scheme: dark) {
      details > details > summary strong {
        color: #afaba0;
      border-bottom: 2px solid #afaba0;
      }
    }
  </style>
</details>
