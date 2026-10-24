---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/request/functions/getPromiseResult.md
---

# &#x20;getPromiseResult()

```ts
function getPromiseResult<T, E>(promise: 
  | Promise<T>
  | Awaitable<T, E>): CacheResult<T, E> | undefined;
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:67](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/request/-private/promise-cache.ts#L67)

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
