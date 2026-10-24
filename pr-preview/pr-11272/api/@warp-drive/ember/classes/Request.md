---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/ember/classes/Request.md
---

# &#x20;Request\<RT, E>

Defined in: [warp-drive-packages/ember/dist/index.d.ts:273](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/index.d.ts#L273)

The `<Request />` component is a powerful tool for managing data fetching and
state in your Ember application. It provides a declarative approach to reactive
control-flow for managing requests and state in your application.

The `<Request />` component is ideal for handling "boundaries", outside which some
state is still allowed to be unresolved and within which it MUST be resolved.

## Request States

`<Request />` has five states, only one of which will be active and rendered at a time.

* `idle`: The component is waiting to be given a request to monitor
* `loading`: The request is in progress
* `error`: The request failed
* `content`: The request succeeded
* `cancelled`: The request was cancelled

Additionally, the `content` state has a `refresh` method that can be used to
refresh the request in the background, which is available as a sub-state of
the `content` state.

As with the `<Await />` component, if no error block is provided and the request
rejects, the error will be rethrown asynchronously (a tick after the render that
observed the rejection) instead of crashing the current render. It remains an
uncaught error that crash-reporting instrumentation can observe. Prefer providing
an `<:error>` block -- the `template-require-request-error-block` ESLint rule
flags a missing one statically. Cancellation errors are swallowed instead of
rethrown if no error block or cancellation block is present.

```gts
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:loading as |state|>
      <Spinner @percentDone={{state.completedRatio}} />
      <button {{on "click" state.abort}}>Cancel</button>
    </:loading>

    <:error as |error state|>
      <ErrorForm @error={{error}} />
      <button {{on "click" state.retry}}>Retry</button>
    </:error>

    <:content as |data state|>
      <h1>{{data.title}}</h1>
      {{#if state.isBackgroundReloading}}
        <SmallSpinner />
        <button {{on "click" state.abort}}>Cancel</button>
      {{else}}
        <button {{on "click" state.refresh}}>Refresh</button>
      {{/if}}
    </:content>

    <:cancelled as |error state|>
      <h2>The Request was cancelled</h2>
      <button {{on "click" state.retry}}>Retry</button>
    </:cancelled>

    <:idle>
      <button {{on "click" @kickOffRequest}}>Load Preview?</button>
    </:idle>

  </Request>
</template>
```

## Streaming Data

The loading state exposes the download `ReadableStream` instance for consumption

```gts
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

## Retry

Cancelled and error'd requests may be retried by calling the `retry` method.

Retry will restart the state progression, using the loading, error, cancelled,
and content blocks as appropriate.

## Reloading

The `reload` method will force the request to be fully re-executed, bypassing
cache and restarting the state progression through the loading, error, and
content blocks as appropriate.

Background reload (refresh) is a special substate of the content state that
allows you to refresh the request in the background. This is useful for when
you want to update the data in the background without blocking the UI.

Reload and refresh are available as methods on the `content` state.

```gts
import { Request } from '@warp-drive/ember';

<template>
  <Request @request={{@request}}>
    <:content as |data state|>
      <h1>{{data.title}}</h1>
      {{#if state.isBackgroundReloading}}
        <SmallSpinner />
        <button {{on "click" state.abort}}>Cancel</button>
      {{/if}}

      <button {{on "click" state.refresh}}>Refresh</button>
      <button {{on "click" state.reload}}>Reload</button>
    </:content>
 </Request>
</template>
```

## Advanced Reloading

We can nest our usage of `<Request />` to handle more advanced
reloading scenarios.

```gts
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

## Autorefresh

`<Request />` supports automatic refresh and reload under certain conditions.

* `online`: This occurs when a browser window or tab comes back to the foreground
  after being backgrounded or when the network reports as being online after
  having been offline.
* `interval`: This occurs when a specified amount of time has passed.
* `invalid`: This occurs when the store emits a notification that the request
  has become invalid.

You can specify when autorefresh should occur by setting the `autorefresh` arg
to `true` or a comma-separated list of the above values.

A value of `true` is equivalent to `'online,invalid'`.

By default, an autorefresh will only occur if the browser was backgrounded or
offline for more than 30s before coming back available. This amount of time can
be tweaked by setting the number of milliseconds via `@autorefreshThreshold`.

This arg also controls the interval at which the request will be refreshed
if the `interval` autorefresh type is enabled.

Finally, the behavior of the request initiated by autorefresh can be adjusted
by setting the `autorefreshBehavior` arg to `'refresh'`, `'reload'`, or `'policy'`.

* `'refresh'`: Refresh the request in the background
* `'reload'`: Force a reload of the request
* `'policy'` (**default**): Let the store's configured CachePolicy decide whether to
  reload, refresh, or do nothing.

More advanced refresh and reload behaviors can be created by passing the reload and
refresh actions into another component. For instance, refresh could be set up on a
timer or on a websocket subscription.

```gts
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

If a matching request is refreshed or reloaded by any other component,
the `Request` component will react accordingly.

## Deduping

The store dedupes requests by identity. If a request is made for the same identity
from multiple `<Request />` components, even if the request is not referentially the
same, only one actual request will be made.

## Extends

* `default`<`RequestSignature`<`RT`, `E`>>

## Type Parameters

### RT

`RT`

### E

`E`

## Constructors

### Constructor

```ts
new Request<RT, E>(owner: Owner, args: EmberRequestArgs<RT>): Request<RT, E>;
```

Defined in: [node\_modules/.pnpm/@glimmer+component@2.1.1/node\_modules/@glimmer/component/dist/index.d.ts:389](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/node_modules/.pnpm/@glimmer+component@2.1.1/node_modules/@glimmer/component/dist/index.d.ts#L389)

#### Parameters

##### owner

`Owner`

##### args

`EmberRequestArgs`<`RT`>

#### Returns

`Request`<`RT`, `E`>

#### Inherited from

```ts
Component<RequestSignature<RT, E>>.constructor
```

## Methods

### willDestroy()

```ts
willDestroy(): void;
```

Defined in: [warp-drive-packages/ember/dist/index.d.ts:304](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/index.d.ts#L304)

Called before the component has been removed from the DOM.

#### Returns

`void`

#### Overrides

```ts
Component.willDestroy
```

## Properties

### state

#### Get Signature

```ts
get state(): RequestSubscription<RT, E>;
```

Defined in: [warp-drive-packages/ember/dist/index.d.ts:290](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/index.d.ts#L290)

The active RequestSubscription for this component's request,
created lazily and recreated if the store changes or a `@subscription` is provided.

##### Returns

`RequestSubscription`<`RT`, `E`>

***

### store

#### Get Signature

```ts
get store(): Store$1 | RequestManager;
```

Defined in: [warp-drive-packages/ember/dist/index.d.ts:283](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/index.d.ts#L283)

The store or request manager used to make the request, resolved from
either the `@store` arg or the consumed context/service.

##### Returns

`Store$1` | [`RequestManager`](../../core/classes/RequestManager.md)
