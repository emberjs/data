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

<style>h3 > em{color:lightgreen;}</style>
<style>
  h3 > em.orange{color:orange;}
  h3 > em.lightblue{color:lightblue;}
  h3 > strong{color:magenta;}
  h4 > em{color:orange}
  h4 > strong{color:lightblue;}
</style>

<h3 align="center">:electron: Data utilities for using <em>Warp</em><strong>Drive</strong> with 🐹 <em class="orange">Ember</em><em class="lightblue">.js</em></h3>
<h4 align="center">And of course, <em>Ember</em><strong>Data</strong> too! </h4>

---

```cli
pnpm install @warp-drive/ember
```

## About

This library provides reactive utilities for working with promises and requests, building over these primitives to provide functions and components that enable you to build robust performant apps with elegant control flow

Documentation

- [PromiseState](#promisestate)
  - [getPromiseState](#getpromisestate)
- [RequestState](#requeststate)
  - [getRequestState](#getrequeststate)

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
asynchronous data in your Ember app. It's *also* a way to optimize your app for
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

Alternatively, use the `<Request>` component. Note: the request component
taps into additional capabilities *beyond* what `RequestState` offers.

- Completion states and an abort function are available as part of loading state

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:loading as |state|>
      <Spinner @percentDone={{state.percentDone}} />
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

- Streaming Data

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

- Cancelled is an additional state.

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

If no error block is present, the error will be rethrown.

- Reloading states

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

- AutoRefresh behavior

Requests can be made to automatically refresh when a browser window or tab comes back to the
foreground after being backgrounded.

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}} @autoRefresh={{true}}>
    <!-- ... -->
  </Request>
</template>
```

Similarly, refresh could be set up on a timer or on a websocket subscription by using the yielded
refresh function and passing it to another component.

```gjs
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}} @autoRefresh={{true}}>
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
