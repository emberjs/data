---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/reactive/functions/getRequestState.md
description: >-
  Returns a cached, reactive state object tracking a request `Future` through
  pending, success, error, and cancellation.
---

# &#x20;getRequestState()

```ts
function getRequestState<RT, E>(future: Future<RT>): Readonly<RequestState<RT, StructuredErrorDocument<E>>>;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:855](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-state.ts#L855)

`getRequestState` can be used in both JavaScript and Template contexts.

It returns a [RequestState](../types/RequestState.md): a reactive object that updates as the
request advances. Calling it again with the same [Future](../../request/types/Future.md) returns the
same object. Check `status` to narrow it to one of four states:

* [PendingRequest](../types/PendingRequest.md) (`'pending'`) is the initial state, before the
  request settles.
* [ResolvedRequest](../types/ResolvedRequest.md) (`'fulfilled'`) holds the response content on `value`.
* [RejectedRequest](../types/RejectedRequest.md) (`'rejected'`) holds the error on `reason`.
* [CancelledRequest](../types/CancelledRequest.md) (`'cancelled'`) is a request that was aborted.
  `isError` is also `true` for a cancelled request, so check `status` or
  `isCancelled` rather than `isError` if you handle it differently.

Every state also exposes a [RequestLoadingState](../types/RequestLoadingState.md) on `loadingState`
for tracking the progress of the response stream.

The [Reactive Control Flow](/guides/the-manual/reactivity/control-flow) guide shows
how to render request states with it, and
[Using The Response](/guides/the-manual/requests/using-the-response) covers the
`Future` it reads.

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

the request [Future](../../request/types/Future.md) to track, as returned by `store.request` or `requestManager.request`

## Returns

[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<[`RequestState`](../types/RequestState.md)<`RT`, [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md)<`E`>>>

the cached [RequestState](../types/RequestState.md) for `future`
