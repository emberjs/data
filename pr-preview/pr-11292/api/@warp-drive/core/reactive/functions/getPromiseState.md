---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/reactive/functions/getPromiseState.md
---

# &#x20;getPromiseState()

```ts
function getPromiseState<T = unknown, E = unknown>(promise: 
  | Promise<T>
| Awaitable<T, E>): Readonly<PromiseState<T, E>>;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:358](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/signals/promise-state.ts#L358)

Returns a reactive state-machine for the provided promise or awaitable.

Repeat calls to `getPromiseState` with the same promise will return the same state object
making is safe and easy to use in templates and JavaScript code to produce reactive
behaviors around promises.

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

If looking to use in a template, consider also the `<Await />` component.

See also [PromiseState](../types/PromiseState.md)

## Type Parameters

### T

`T` = `unknown`

### E

`E` = `unknown`

## Parameters

### promise

| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>
| [`Awaitable`](../../request/types/Awaitable.md)<`T`, `E`>

## Returns

[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`PromiseState`](../types/PromiseState.md)<`T`, `E`>>
