---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/alien-signals/primitives/functions/readMemo.md
description: >-
  Returns a memo's current result, recomputing it only when something it read
  changed.
---

# &#x20;readMemo()&#x20;

```ts
function readMemo<T>(memo: MemoNode<T>): T;
```

Defined in: [primitives.ts:307](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/alien-signals/src/primitives.ts#L307)

Returns the latest result of `memo`, running its function only if something it read changed
since the last run. Inside another memo, that memo now depends on `memo`.

Throws the cached error if the function threw, and throws if `memo` reads itself, directly or
through other memos.

## Type Parameters

### T

`T`

## Parameters

### memo

[`MemoNode`](../types/MemoNode.md)<`T`>

the memo to read

## Returns

`T`

the memo's current result

## Example

```ts
import { createMemo, readMemo } from '@warp-drive/alien-signals/primitives';

const total = createMemo(cart, 'total', () => cart.items.reduce((sum, item) => sum + item.price, 0));
readMemo(total);
```
