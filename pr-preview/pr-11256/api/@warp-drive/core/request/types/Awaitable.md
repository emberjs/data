---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/request/types/Awaitable.md
description: >-
  Any promise-like value with `then`, `catch`, and `finally`, as accepted by the
  promise-result cache and `getPromiseState`.
---

# &#x20;Awaitable\<T = `unknown`, E = `unknown`>

```ts
type Awaitable<T = unknown, E = unknown> = {
  catch: (onRejected: (reason: E) => unknown) => unknown;
  finally: (onFinally: () => unknown) => unknown;
  then: (onFulfilled: (value: T) => unknown, onRejected: (reason: E) => unknown) => unknown;
};
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:15](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/promise-cache.ts#L15)

The minimal, structural subset of the `Promise` interface required to be
cached and inspected by [setPromiseResult](../functions/setPromiseResult.md) / [getPromiseResult](../functions/getPromiseResult.md)
(and by `getPromiseState`). Anything that is at least `then`/`catch`/`finally`
"shaped" (including a real `Promise` or [Future](Future.md)) satisfies this.

## Type Parameters

### T

`T` = `unknown`

### E

`E` = `unknown`

## Properties

### catch

```ts
catch: (onRejected: (reason: E) => unknown) => unknown;
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:27](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/promise-cache.ts#L27)

Registers a rejection handler, `Promise.prototype.catch`-style.

#### Parameters

##### onRejected

(`reason`: `E`) => `unknown`

#### Returns

`unknown`

***

### finally

```ts
finally: (onFinally: () => unknown) => unknown;
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:33](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/promise-cache.ts#L33)

Registers a handler run on settlement, `Promise.prototype.finally`-style.

#### Parameters

##### onFinally

() => `unknown`

#### Returns

`unknown`

***

### then

```ts
then: (onFulfilled: (value: T) => unknown, onRejected: (reason: E) => unknown) => unknown;
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:21](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/request/-private/promise-cache.ts#L21)

Registers fulfillment/rejection handlers, `Promise.prototype.then`-style.

#### Parameters

##### onFulfilled

(`value`: `T`) => `unknown`

##### onRejected

(`reason`: `E`) => `unknown`

#### Returns

`unknown`
