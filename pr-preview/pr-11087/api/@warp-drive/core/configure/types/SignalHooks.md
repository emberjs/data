---
url: /pr-preview/pr-11087/api/@warp-drive/core/configure/types/SignalHooks.md
---

# &#x20;SignalHooks\<T = `SignalRef`>

```ts
interface SignalHooks<T = SignalRef> {
  consumeSignal: (signal: T) => void;
  createMemo: <F>(obj: object, key: string | symbol, fn: () => F) => () => F;
  createSignal: (obj: object, key: string | symbol) => T;
  notifySignal: (signal: T) => void;
  waitFor?: <K>(promise: Promise<K>) => Promise<K>;
  willSyncFlushWatchers: () => boolean;
}
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:70](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L70)

The hooks which MUST be configured in order to use reactive arrays,
resources and documents with framework specfic signals or TC39 signals.

Support for multiple frameworks simultaneously can be done via
this abstraction by returning multiple signals from the `createSignal`
method, and consuming the correct one via the correct framework via
the `consumeSignal` and `notifySignal` methods.

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

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:84](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L84)

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

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:96](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L96)

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

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:80](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L80)

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

### notifySignal

```ts
notifySignal: (signal: T) => void;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:88](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L88)

Alert a signal previously created via createSignal that its associated value has changed.

#### Parameters

##### signal

`T`

#### Returns

`void`

***

### waitFor?

```ts
optional waitFor?: <K>(promise: Promise<K>) => Promise<K>;
```

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:115](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L115)

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

Defined in: [warp-drive-packages/core/src/signals/reactivity/configure.ts:109](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/signals/reactivity/configure.ts#L109)

If the signals implementation allows synchronous flushing of watchers, and
has scheduled such a flush (e.g. watchers will run before the current calling
context yields) this should return "true".

This is generally something that should return false for anything but the few
frameworks that extensively handle their own reactivity => render scheduling.

For an example, see EmberJS's backburner scheduler which functioned as a microtask
polyfill.

#### Returns

`boolean`
