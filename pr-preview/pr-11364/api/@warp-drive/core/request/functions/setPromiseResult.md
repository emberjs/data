---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/request/functions/setPromiseResult.md
description: >-
  Records a promise's settled value or error so it can later be read
  synchronously with `getPromiseResult`.
---

# &#x20;setPromiseResult()

```ts
function setPromiseResult(promise: 
  | Awaitable<unknown, unknown>
  | Promise<unknown>, result: CacheResult): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:61](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/request/-private/promise-cache.ts#L61)

Cache the settled result (or error) of a promise-like value so that its
outcome can be synchronously read later via [getPromiseResult](getPromiseResult.md),
without needing to await it again.

## Parameters

### promise

| [`Awaitable`](../types/Awaitable.md)<`unknown`, `unknown`>
| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

### result

`CacheResult`

## Returns

`void`
