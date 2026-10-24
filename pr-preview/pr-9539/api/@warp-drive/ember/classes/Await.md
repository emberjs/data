---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/ember/classes/Await.md
description: >-
  Component that renders a pending, error or success block for the state of a
  promise or awaitable.
---

# &#x20;\<Await />

Defined in: [warp-drive-packages/ember/src/-private/await.gts:143](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/ember/src/-private/await.gts#L143)

The `<Await />` component allow you to utilize reactive control flow
for asynchronous states in your application.

Await is ideal for handling "boundaries", outside which some state is
still allowed to be unresolved and within which it MUST be resolved.

See [Async as Reactive State](/guides/the-manual/reactivity/derivation) for
the pattern it supports: store the promise and derive its state.

```gts
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

The `<Await />` component requires that error states are properly handled.

If no error block is provided and the promise rejects, the error will be
rethrown asynchronously (a tick after the render that observed the rejection)
instead of crashing the current render. It remains an uncaught error that
crash-reporting instrumentation can observe. Prefer providing an `<:error>`
block -- the `template-require-request-error-block` ESLint rule flags a missing
one statically.

## Extends

* `default`<`AwaitSignature`<`T`, `E`>>

## Type Parameters

### T

`T`

### E

`E`

## Constructors

### Constructor

```ts
new Await<T, E>(owner: Owner, args: {
  promise:   | Promise<T>
     | Awaitable<T, E>;
}): Await<T, E>;
```

#### Parameters

##### owner

`Owner`

##### args

###### promise

| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>
| `Awaitable`<`T`, `E`>

#### Returns

`Await`<`T`, `E`>

#### Inherited from

```ts
Component<AwaitSignature<T, E>>.constructor
```

## Properties

### error

#### Get Signature

```ts
get error(): E;
```

Defined in: [warp-drive-packages/ember/src/-private/await.gts:154](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/ember/src/-private/await.gts#L154)

The rejection reason, once [state](#state) has errored.

##### Returns

`E`

***

### result

#### Get Signature

```ts
get result(): T;
```

Defined in: [warp-drive-packages/ember/src/-private/await.gts:161](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/ember/src/-private/await.gts#L161)

The resolved value, once [state](#state) has succeeded.

##### Returns

`T`

***

### state

#### Get Signature

```ts
get state(): Readonly<PromiseState<T, E>>;
```

Defined in: [warp-drive-packages/ember/src/-private/await.gts:147](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/ember/src/-private/await.gts#L147)

The reactive PromiseState for the awaited promise.

##### Returns

[`Readonly`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)<`PromiseState`<`T`, `E`>>
