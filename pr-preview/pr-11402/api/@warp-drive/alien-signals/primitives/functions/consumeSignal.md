---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/alien-signals/primitives/functions/consumeSignal.md
description: Makes the running memo depend on a signal; a no-op outside of a memo.
---

# &#x20;consumeSignal()&#x20;

```ts
function consumeSignal(signal: SignalNode): void;
```

Defined in: [primitives.ts:196](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/alien-signals/src/primitives.ts#L196)

Records that the memo whose function is running read `signal`, so that a later
[notifySignal](notifySignal.md) makes that memo recompute. Outside of a memo it does nothing; use
[Watcher.watch](../classes/Watcher.md#watch) to observe a signal from outside the graph.

## Parameters

### signal

[`SignalNode`](../types/SignalNode.md)

the signal that was read

## Returns

`void`

## Example

```ts
import { consumeSignal, createMemo, readMemo } from '@warp-drive/alien-signals/primitives';

const fullName = createMemo(user, 'fullName', () => {
  consumeSignal(nameSignal);
  return `${user.first} ${user.last}`;
});
readMemo(fullName);
```
