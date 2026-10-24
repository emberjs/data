---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/configure/types/SignalHooks.md
description: >-
  The create, consume, notify, and memo hooks a framework or TC39 signals
  implementation supplies to `setupSignals` to make WarpDrive data reactive.
---

# &#x20;SignalHooks\<T = `SignalRef`>

```ts
interface SignalHooks<T = SignalRef> {
  consumeSignal: (signal: T) => void;
  createMemo: <F>(obj: object, key: string | symbol, fn: () => F) => () => F;
  createSignal: (obj: object, key: string | symbol) => T;
  isTracking?: () => boolean;
  notifySignal: (signal: T) => void;
  register?: <K>(buildConfig: (options: HooksOptions) => SignalHooks<K>) => void;
  waitFor?: <K>(promise: Promise<K>) => Promise<K>;
  willSyncFlushWatchers: () => boolean;
}
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:74](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L74)

The hooks which MUST be configured in order to use reactive arrays,
resources and documents with framework specfic signals or TC39 signals.

To support multiple frameworks on the same page, import
`@warp-drive/alien-signals/install` before each framework's `install` entry
point. Its hooks implement [SignalHooks.register](#register), so each framework's
hooks, passed to [registerSignals](../functions/registerSignals.md), are added to its signals graph
instead of replacing it, and its memos stay up to date for every framework.
See [Using Ember and React on the Same Page](/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md).

Unlike many signals implementations, WarpDrive does not wrap values as
signals directly, but instead uses signals to alert the reactive layer
to changes in the underlying cache. E.g. a signal is associated to a value,
but does not serve as the cache for that value directly. We refer to this as
a "gate", the pattern has also been called "side-signals".

A no-op implementation is allowed, though it may lead to performance issues
in locations that use createMemo as no memoization would be done. This is
typically desirable only when integrating with a framework that does its own
memoization and does not integrate with any signals-like primitive. For these
scenarios you may also be interested in integrating with the [NotificationManager](../../store/types/NotificationManager.md)
more directly.

## Type Parameters

### T

`T` = `SignalRef`

## Properties

### consumeSignal

```ts
consumeSignal: (signal: T) => void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:88](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L88)

Consume (mark as acccessed) a signal previously created via createSignal.

#### Parameters

##### signal

`T`

#### Returns

`void`

***

### createMemo

```ts
createMemo: <F>(obj: object, key: string | symbol, fn: () => F) => () => F;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:100](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L100)

Take the given function and wrap it in signals-based memoization. Analagous
to a Computed in the TC39 spec.

Should return a function which when run provides the latest value of the original
function.

#### Type Parameters

##### F

`F`

#### Parameters

##### obj

`object`

##### key

`string` | `symbol`

##### fn

() => `F`

#### Returns

() => `F`

***

### createSignal

```ts
createSignal: (obj: object, key: string | symbol) => T;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:84](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L84)

Create a signal for the given key associated to the given object.

This method does *not* need to cache the signal, it will only be
called once for a given object and key. However, if your framework
will look for a signal cache on the object in a given location or may
have created its own signal on the object for some reason it may be
useful to ensure such cache is properly updated.

#### Parameters

##### obj

`object`

##### key

`string` | `symbol`

#### Returns

`T`

***

### isTracking?

```ts
optional isTracking?: () => boolean;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:129](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L129)

An optional method that returns whether a signal consumed right now would be tracked by the
framework, for instance because a component is rendering.

***Warp*Drive** itself does not call it. Hooks that compose other implementations, such as
the ones `@warp-drive/alien-signals/install` configures, use it to skip work for reads that no
framework would track.

#### Returns

`boolean`

***

### notifySignal

```ts
notifySignal: (signal: T) => void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:92](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L92)

Alert a signal previously created via createSignal that its associated value has changed.

#### Parameters

##### signal

`T`

#### Returns

`void`

***

### register?

```ts
optional register?: <K>(buildConfig: (options: HooksOptions) => SignalHooks<K>) => void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:138](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L138)

An optional method, present only on hooks that compose other signals implementations into
their own, such as the ones `@warp-drive/alien-signals/install` configures.

[registerSignals](../functions/registerSignals.md) calls it instead of replacing the configured hooks, so that a
framework's hooks are added alongside the ones already configured rather than replacing them.

#### Type Parameters

##### K

`K`

#### Parameters

##### buildConfig

(`options`: [`HooksOptions`](HooksOptions.md)) => `SignalHooks`<`K`>

#### Returns

`void`

***

### waitFor?

```ts
optional waitFor?: <K>(promise: Promise<K>) => Promise<K>;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:119](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L119)

An optional method that allows wrapping key promises within WarpDrive
for things like test-waiters.

#### Type Parameters

##### K

`K`

#### Parameters

##### promise

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`K`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`K`>

***

### willSyncFlushWatchers

```ts
willSyncFlushWatchers: () => boolean;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:113](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/signals/reactivity/configure.ts#L113)

If the signals implementation allows synchronous flushing of watchers, and
has scheduled such a flush (e.g. watchers will run before the current calling
context yields) this should return "true".

This is generally something that should return false for anything but the few
frameworks that extensively handle their own reactivity => render scheduling.

For an example, see EmberJS's backburner scheduler which functioned as a microtask
polyfill.

#### Returns

`boolean`
