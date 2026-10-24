---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/alien-signals/install/types/SignalIntegration.md
description: >-
  The hooks a signals implementation or framework integration registers with the
  alien-signals graph.
---

# &#x20;SignalIntegration\<T = | [`SignalNode`](../../primitives/types/SignalNode.md) | [`MemoNode`](../../primitives/types/MemoNode.md)>&#x20;

```ts
interface SignalIntegration<T = 
  | SignalNode
  | MemoNode> {
  consumeSignal?: (signal: T) => void;
  createMemo?: unknown;
  createSignal?: (obj: object, key: string | symbol) => T;
  isTracking?: () => boolean;
  notifySignal?: (signal: T) => void;
  waitFor?: <K>(promise: Promise<K>) => Promise<K>;
  willSyncFlushWatchers?: () => boolean;
}
```

Defined in: [install.ts:76](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L76)

Hooks that add another signals implementation, or a framework integration built on
[`@warp-drive/alien-signals/primitives`](/api/@warp-drive/alien-signals/primitives/), to the
graph that `@warp-drive/alien-signals/install` configures. Pass a function that builds them to
[registerSignalIntegration](../functions/registerSignalIntegration.md), or to `registerSignals` from `@warp-drive/core/configure`.

Every hook is optional, and an integration takes one of two shapes:

* **It brings its own signals**, such as Ember's tags. `createSignal` creates one alongside each
  graph signal, and `consumeSignal` and `notifySignal` receive it whenever the graph signal is
  consumed or notified. Each memo the integration reads also gets one of its signals, created
  for the memo's key the first time it is read while the integration is tracking. Reading the
  memo consumes that signal, whether the memo runs or returns its cached result, and the graph
  notifies it as soon as anything the memo depends on changes. To the integration, a memo is
  just one more signal.
* **It observes the graph**, as `@warp-drive/react` does. Without `createSignal`,
  `consumeSignal` receives the graph's own nodes: each [SignalNode](../../primitives/types/SignalNode.md) when it is consumed,
  and each [MemoNode](../../primitives/types/MemoNode.md) just before it is read, whether it runs or returns its cached
  result. `notifySignal` receives each [SignalNode](../../primitives/types/SignalNode.md) when it is notified.

Either kind may also use `willSyncFlushWatchers` and `waitFor`.

Memos always come from the graph, so a `createMemo` hook is ignored. This means the
[SignalHooks](../../../core/configure/types/SignalHooks.md) built for `setupSignals` can be registered as they are.

## Type Parameters

### T

`T` =
| [`SignalNode`](../../primitives/types/SignalNode.md)
| [`MemoNode`](../../primitives/types/MemoNode.md)

## Properties

### consumeSignal?

```ts
optional consumeSignal?: (signal: T) => void;
```

Defined in: [install.ts:88](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L88)

Called when a signal is consumed. For an integration with its own signals, it is also called
with the integration's signal for a memo each time that memo is read. For an integration that
observes the graph, it is also called with each memo just before the memo is read.

#### Parameters

##### signal

`T`

#### Returns

`void`

***

### createMemo?

```ts
optional createMemo?: unknown;
```

Defined in: [install.ts:114](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L114)

Ignored: memos always come from the graph.

***

### createSignal?

```ts
optional createSignal?: (obj: object, key: string | symbol) => T;
```

Defined in: [install.ts:82](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L82)

Creates this integration's own signal for `key` on `obj`, paired with the graph signal created
for the same key. Omit it to receive the graph's own nodes in `consumeSignal` and
`notifySignal` instead.

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

Defined in: [install.ts:100](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L100)

For an integration with its own signals: whether a signal consumed now would be tracked. When
this returns `false`, reading a memo neither consumes the integration's signal for it nor
subscribes that signal to the memo's changes. Omit it to treat every read as tracked.

#### Returns

`boolean`

***

### notifySignal?

```ts
optional notifySignal?: (signal: T) => void;
```

Defined in: [install.ts:94](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L94)

Called when a signal is notified, after the graph has been notified. For an integration with
its own signals, it is also called with the integration's signal for a memo once something the
memo depends on changes.

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

Defined in: [install.ts:110](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L110)

See [SignalHooks.waitFor](../../../core/configure/types/SignalHooks.md#waitfor). The graph passes each promise through every integration's
`waitFor`, in the order they were registered.

#### Type Parameters

##### K

`K`

#### Parameters

##### promise

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`K`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`K`>

***

### willSyncFlushWatchers?

```ts
optional willSyncFlushWatchers?: () => boolean;
```

Defined in: [install.ts:105](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/alien-signals/src/install.ts#L105)

See [SignalHooks.willSyncFlushWatchers](../../../core/configure/types/SignalHooks.md#willsyncflushwatchers). The graph's `willSyncFlushWatchers` returns
`true` if any integration's does.

#### Returns

`boolean`
