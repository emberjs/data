---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/request/functions/getPromiseResult.md
description: >-
  Synchronously returns the settled value or error previously recorded for a
  promise, or `undefined` if none was recorded.
---

# &#x20;getPromiseResult()

```ts
function getPromiseResult<T, E>(promise: 
  | Promise<T>
  | Awaitable<T, E>): CacheResult<T, E> | undefined;
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:73](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/request/-private/promise-cache.ts#L73)

Synchronously read the settled result (or error) previously recorded for
a promise-like value via [setPromiseResult](setPromiseResult.md), if any.

## Type Parameters

### T

`T`

### E

`E`

## Parameters

### promise

| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`T`>
| [`Awaitable`](../types/Awaitable.md)<`T`, `E`>

## Returns

`CacheResult`<`T`, `E`> | `undefined`
