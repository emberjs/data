---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/alien-signals/primitives/functions/createSignal.md
description: >-
  Creates a value-less signal that memos and watchers can depend on and that
  `notifySignal` marks as changed.
---

# &#x20;createSignal()&#x20;

```ts
function createSignal(obj: object, key: string | symbol): SignalNode;
```

Defined in: [primitives.ts:169](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L169)

Creates a [SignalNode](../types/SignalNode.md) for `key` on `obj`. This is the `createSignal` hook of the
[SignalHooks](../../../core/configure/types/SignalHooks.md) that the `install` entry point configures.

## Parameters

### obj

`object`

the object the signal belongs to, kept for debugging in development builds

### key

`string` | `symbol`

the key the signal is for, kept for debugging in development builds

## Returns

[`SignalNode`](../types/SignalNode.md)

a new signal

## Example

```ts
import { consumeSignal, createSignal, notifySignal } from '@warp-drive/alien-signals/primitives';

const signal = createSignal(user, 'name');
consumeSignal(signal); // inside a memo, the memo now depends on the signal
notifySignal(signal); // the memo recomputes on its next read
```
