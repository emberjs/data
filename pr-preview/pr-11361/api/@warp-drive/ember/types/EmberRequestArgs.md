---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/ember/types/EmberRequestArgs.md
description: >-
  The args of the Ember `<Request />` component: the request or query to run,
  store, subscription, autorefresh options, and chrome.
---

# &#x20;EmberRequestArgs\<RT, E>

```ts
interface EmberRequestArgs<RT, E> extends RequestArgs<RT, E> {
  chrome?: ComponentLike<{
  Args: {
     features: ContentFeatures<RT>;
     state: RequestState | null;
  };
  Blocks: {
     default: [];
  };
}>;
}
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:87](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/ember/src/-private/request.gts#L87)

The args accepted by the [\`\<Request />\`](../classes/Request.md) component.

Every arg is optional, but either `@request` or `@query` is needed for the
component to leave the `idle` state, and a store must be available via
`@store`, context, or the store service.

| Arg | Type | Purpose |
| --- | --- | --- |
| `@request` | `Future` | A request already made via `store.request` to monitor |
| `@query` | `StoreRequestInput` | A request for the component to make and monitor |
| `@store` | `Store` or `RequestManager` | The store to make requests with |
| `@subscription` | `RequestSubscription` | A subscription to render in place of creating one |
| `@autorefresh` | `boolean` or `string` | When to automatically refresh the request |
| `@autorefreshThreshold` | `number` | How long in ms before an autorefresh happens |
| `@autorefreshBehavior` | `'refresh'`, `'reload'` or `'policy'` | How autorefresh fetches |
| `@chrome` | `Component` | A component that wraps every state's block |

All but `@chrome` are inherited from RequestArgs and documented on
the members below.

## Example

```gts
import { Request } from '@warp-drive/ember';
import { findRecord } from '@warp-drive/utilities/json-api';

<template>
  <Request
    @query={{findRecord "user" @userId}}
    @autorefresh="online,interval"
    @autorefreshThreshold={{60_000}}
    @autorefreshBehavior="refresh"
  >
    <:content as |result|>{{result.data.name}}</:content>
    <:error as |error|>{{error.message}}</:error>
  </Request>
</template>
```

## Extends

* `RequestArgs`<`RT`, `E`>

## Type Parameters

### RT

`RT`

### E

`E`

## Properties

### chrome?

```ts
optional chrome?: ComponentLike<{
  Args: {
     features: ContentFeatures<RT>;
     state: RequestState | null;
  };
  Blocks: {
     default: [];
  };
}>;
```

Defined in: [warp-drive-packages/ember/src/-private/request.gts:110](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/ember/src/-private/request.gts#L110)

A component that wraps whichever block is rendered, so shared UI such as
a layout or a refresh indicator stays mounted as the request moves
between states. It yields to its default block where the state's block
renders.

It receives `@state`, the RequestState (`null` while idle), and
`@features`, the ContentFeatures used to refresh, reload, or
abort the request.

```gts
const Chrome = <template>
  <div class={{if @features.isRefreshing "is-refreshing"}}>{{yield}}</div>
</template>;

<template>
  <Request @request={{@request}} @chrome={{Chrome}}>
    <:content as |result|>{{result.data.name}}</:content>
  </Request>
</template>
```
