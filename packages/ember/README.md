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

<h3 align="center">🐹 Data utilities for using WarpDrive with Ember.js</h3>

```cli
pnpm install @warp-drive/ember
```

## Performance

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

## Documentation

```ts
const result = await store.request(listRequest);

return result.content.data;
```

- as a developer, I want to fetch data in a provider or route, but avoid prop drilling to access that data
  in a component.
- as a developer, if a request I make from a component has already been fulfilled, I want to continue to render
  synchronously

### functions (and helpers!)


### getPromiseState

PromiseStates provide a reactive wrapper for promises which allow you write declarative
code around a promise's control flow. It is useful in both template and JavaScript contexts,
allowing you to quickly derive behaviors and data from pending, error and success states.

```ts
import { getPromiseState } from '@warp-drive/ember';

const state = getPromiseState(promise);
```

This will return an instance of AsyncData

```ts
interface PromiseState<T = unknown, E = unknown> {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  result: T | null;
  error: E | null;
}
```

```hbs
{{#let (get-promise-state this.request) as |state|}}
  {{#if state.isPending}} <Spinner />
  {{else if state.isError}} <ErrorForm @error={{state.error}} />
  {{else}}
    <h1>{{state.result.title}}</h1>
  {{/if}}
{{/let}}
```

```js
class Component {
  @cached
  get title() {
    const state = getPromiseState(this.request);
    if (state.isPending) {
      return 'loading...';
    }
    if (state.isError) { return null; }
    return state.result.title;
  }
}
```

### RequestState

RequestState 


### Components

#### Request

The `<Request>` component helps manage request states like loading, reloading
and error. It has no layout, of its own.

```hbs
<Request @query={{this.query}} @subscribe={{true}}>
  <:content as |data|>
    <h1>{{data.title}}</h1>
  </:content>
  <:loading as |percentage|>
    <Spinner @percentDone={{percentage}} />
  </:loading>
  <:error as |error|>
    <ErrorForm @error={{state.result}} />
  </:error>
</Request>
```

#### Subscriptions

#### Streaming



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
