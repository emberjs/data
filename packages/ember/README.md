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

## Coming Soon, a guide 🚧

## Api Documentation

```ts
const result = await store.request(listRequest);

return result.content.data;
```

- as a developer, I want to fetch data in a provider or route, but avoid prop drilling to access that data
  in a component.
- as a developer, if a request I make from a component has already been fulfilled, I want to continue to render
  synchronously

### functions (and helpers!)


### AsyncData

```ts
import { getPromiseState } from '@warp-drive/ember';

const state = getPromiseState(promise);
```

This will return an instance of AsyncData

```ts
interface AsyncData<T = unknown> {
  isPending: boolean;
  isFulfilled: boolean;
  isError: boolean;
  result: Error | <T>
}
```

```hbs
{{#let (get-promise-state this.request) as |state|}}
  {{#if state.isPending}} <Spinner />
  {{else if state.isError}} <ErrorForm @error={{state.result}} />
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

### Pagination

### Components

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
