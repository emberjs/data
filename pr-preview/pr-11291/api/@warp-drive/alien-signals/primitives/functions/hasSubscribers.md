---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/alien-signals/primitives/functions/hasSubscribers.md
description: Whether any memo or watcher depends on a signal or memo.
---

# &#x20;hasSubscribers()&#x20;

```ts
function hasSubscribers(node: 
  | SignalNode
  | MemoNode<unknown>): boolean;
```

Defined in: [primitives.ts:380](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/alien-signals/src/primitives.ts#L380)

Whether any memo or [Watcher](../classes/Watcher.md) depends on `node`. Useful for debug logging.

## Parameters

### node

| [`SignalNode`](../types/SignalNode.md)
| [`MemoNode`](../types/MemoNode.md)<`unknown`>

a signal or memo

## Returns

`boolean`

true if a memo or watcher depends on `node`

## Example

```ts
import { hasSubscribers } from '@warp-drive/alien-signals/primitives';

if (!hasSubscribers(signal)) console.log('nothing will update');
```
