---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/alien-signals/primitives/classes/Watcher.md
description: >-
  Observes signals and memos, calling back once when any of them may have
  changed until it is re-armed.
---

# &#x20;Watcher&#x20;

Defined in: [primitives.ts:418](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L418)

Observes signals and memos from outside the graph. The `notify` callback passed to the
constructor runs, at most once, as soon as anything watched may have changed: after a
[notifySignal](../functions/notifySignal.md) of a watched signal, or of a signal a watched memo read. Call
[Watcher.rearm](#rearm) once you have handled the notification to be notified of the next change.

`notify` runs synchronously, inside the `notifySignal` call that caused it, so it should only
schedule work. Reading or notifying signals from within it is not supported.

A watched memo should be read after it is watched, since the watcher only hears about changes
to what the memo read during its last run.

## Example

```ts
import { Watcher, readMemo } from '@warp-drive/alien-signals/primitives';

const watcher = new Watcher(() => {
  queueMicrotask(() => {
    render();
    watcher.rearm();
  });
});

watcher.watch(memo);
readMemo(memo);

// when the view goes away
watcher.unwatchAll();
```

## Implements

* `ReactiveNode`

## Constructors

### Constructor

```ts
new Watcher(notify: () => void): Watcher;
```

Defined in: [primitives.ts:443](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L443)

#### Parameters

##### notify

() => `void`

called once when anything watched may have changed, until [Watcher.rearm](#rearm) is called

#### Returns

`Watcher`

## Methods

### getPending()

```ts
getPending(): (
  | SignalNode
  | MemoNode<unknown>)[];
```

Defined in: [primitives.ts:492](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L492)

Lists what this watcher is watching that may have changed since it was created or last
re-armed: memos that are due to recompute, and, in development builds only, signals that
have been notified. Useful for debug logging; it walks everything watched.

#### Returns

(
| [`SignalNode`](../types/SignalNode.md)
| [`MemoNode`](../types/MemoNode.md)<`unknown`>)\[]

the watched signals and memos that may have changed

***

### rearm()

```ts
rearm(): void;
```

Defined in: [primitives.ts:478](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L478)

Re-enables `notify` after a notification has been handled, so that the next change to
anything watched calls it again.

#### Returns

`void`

***

### unwatchAll()

```ts
unwatchAll(): void;
```

Defined in: [primitives.ts:507](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L507)

Stops watching everything and re-arms the watcher. A memo that nothing else depends on
releases its own dependencies and recomputes on its next read.

#### Returns

`void`

***

### watch()

```ts
watch(node: 
  | SignalNode
  | MemoNode<unknown>): void;
```

Defined in: [primitives.ts:466](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L466)

Starts watching a signal or memo. Watching something already watched does nothing.

#### Parameters

##### node

| [`SignalNode`](../types/SignalNode.md)
| [`MemoNode`](../types/MemoNode.md)<`unknown`>

the signal or memo to watch

#### Returns

`void`

## Properties

### isNotified

#### Get Signature

```ts
get isNotified(): boolean;
```

Defined in: [primitives.ts:457](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L457)

Whether `notify` has been called since the watcher was created or last re-armed.

##### Returns

`boolean`

***

### watched

#### Get Signature

```ts
get watched(): ReadonlySet<
  | SignalNode
| MemoNode<unknown>>;
```

Defined in: [primitives.ts:450](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L450)

Everything this watcher is watching. Useful for debug logging.

##### Returns

`ReadonlySet`<
| [`SignalNode`](../types/SignalNode.md)
| [`MemoNode`](../types/MemoNode.md)<`unknown`>>
