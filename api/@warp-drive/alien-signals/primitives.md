---
url: https://canary.warp-drive.io/api/@warp-drive/alien-signals/primitives.md
description: >-
  Signals, memos and a watcher, built on alien-signals, that back WarpDrive
  reactivity and let framework integrations observe it.
---

The reactive primitives behind `@warp-drive/alien-signals`: a small signals graph built on the
push-pull algorithm from [alien-signals](https://github.com/stackblitz/alien-signals).

Most apps only need the [`install`](/api/@warp-drive/alien-signals/install/) entry point. Import
from this module when you are building a framework integration that needs to observe
***Warp*Drive**'s signals, the way `@warp-drive/react` does for its `ReactiveContext`:

```ts
import { Watcher, createSignal, consumeSignal, notifySignal } from '@warp-drive/alien-signals/primitives';
```

The graph implements only what ***Warp*Drive**'s [SignalHooks](../../core/configure/types/SignalHooks.md) need, not the TC39 Signals
API:

* a [SignalNode](types/SignalNode.md) holds no value. It is a "side signal" that tells consumers the value it
  guards has changed, so every [notifySignal](functions/notifySignal.md) counts as a change.
* a [MemoNode](types/MemoNode.md) caches the result of a function, including a thrown error, until a signal
  or memo it read changes.
* a [Watcher](classes/Watcher.md) is told, once, when anything it watches may have changed.

A memo that nothing subscribes to (no watcher, and no other memo that reads it) releases its
links to the signals it read in a microtask after it is read, so a long-lived signal never keeps
a short-lived memo, or the object that owns it, alive. Its next read recomputes it.

## Classes

* [Watcher](classes/Watcher.md)

## Functions

* [consumeSignal](functions/consumeSignal.md)
* [createMemo](functions/createMemo.md)
* [createSignal](functions/createSignal.md)
* [hasSubscribers](functions/hasSubscribers.md)
* [isTracking](functions/isTracking.md)
* [notifySignal](functions/notifySignal.md)
* [readMemo](functions/readMemo.md)

## Types

* [MemoNode](types/MemoNode.md)
* [SignalNode](types/SignalNode.md)
