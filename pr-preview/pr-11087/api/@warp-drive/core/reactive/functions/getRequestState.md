---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/reactive/functions/getRequestState.md
---

# &#x20;getRequestState()

```ts
function getRequestState<RT, E>(future: Future<RT>): Readonly<RequestState<RT, StructuredErrorDocument<E>>>;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:825](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/request-state.ts#L825)

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
    {{#if state.isPending}}
      <Spinner />
    {{else if state.isError}}
      <ErrorForm @error={{state.error}} />
    {{else}}
      <h1>{{state.result.title}}</h1>
    {{/if}}
  {{/let}}
</template>
```

If looking to use in a template, consider also the `<Request />` component
which offers a number of additional capabilities for requests *beyond* what
`RequestState` provides.

## Type Parameters

### RT

`RT`

### E

`E`

## Parameters

### future

[`Future`](../../request/types/Future.md)<`RT`>

## Returns

[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`RequestState`](../types/RequestState.md)<`RT`, [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md)<`E`>>>
