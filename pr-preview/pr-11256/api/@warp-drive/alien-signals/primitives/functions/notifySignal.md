---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/alien-signals/primitives/functions/notifySignal.md
description: >-
  Marks everything that depends on a signal as changed and notifies the watchers
  that observe it.
---

# &#x20;notifySignal()&#x20;

```ts
function notifySignal(signal: SignalNode): void;
```

Defined in: [primitives.ts:221](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/alien-signals/src/primitives.ts#L221)

Tells everything that depends on `signal` that the value it guards changed: memos that read it
recompute on their next read, and each [Watcher](../classes/Watcher.md) watching it, or a memo that read it, is
notified. Watchers are notified after the whole graph has been marked, before this returns.

## Parameters

### signal

[`SignalNode`](../types/SignalNode.md)

the signal whose value changed

## Returns

`void`

## Example

```ts
import { createSignal, notifySignal } from '@warp-drive/alien-signals/primitives';

const signal = createSignal(user, 'name');
user.cachedName = 'Chris';
notifySignal(signal);
```
