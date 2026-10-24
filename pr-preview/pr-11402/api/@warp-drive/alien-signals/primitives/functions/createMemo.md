---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/alien-signals/primitives/functions/createMemo.md
description: >-
  Creates a memo that caches a function's result, or its error, until a signal
  or memo it read changes.
---

# &#x20;createMemo()&#x20;

```ts
function createMemo<T>(
   obj: object, 
   key: string | symbol, 
   fn: () => T
): MemoNode<T>;
```

Defined in: [primitives.ts:259](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/alien-signals/src/primitives.ts#L259)

Creates a [MemoNode](../types/MemoNode.md) that caches the result of `fn`. Read it with [readMemo](readMemo.md): the
first read runs `fn`, and later reads return the cached result until a signal or memo `fn` read
changes. If `fn` throws, the error is cached and rethrown by each read until then.

## Type Parameters

### T

`T`

## Parameters

### obj

`object`

the object the memo belongs to, kept for debugging in development builds

### key

`string` | `symbol`

the key the memo is for, kept for debugging in development builds

### fn

() => `T`

the function whose result to cache

## Returns

[`MemoNode`](../types/MemoNode.md)<`T`>

a new memo, which has not run `fn` yet

## Example

```ts
import { createMemo, readMemo } from '@warp-drive/alien-signals/primitives';

const fullName = createMemo(user, 'fullName', () => `${user.firstName} ${user.lastName}`);
readMemo(fullName); // runs the function
readMemo(fullName); // returns the cached result
```
