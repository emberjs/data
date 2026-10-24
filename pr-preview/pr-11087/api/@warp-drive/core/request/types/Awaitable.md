---
url: /pr-preview/pr-11087/api/@warp-drive/core/request/types/Awaitable.md
---

# &#x20;Awaitable\<T = `unknown`, E = `unknown`>

```ts
type Awaitable<T = unknown, E = unknown> = {
  catch: (onRejected: (reason: E) => unknown) => unknown;
  finally: (onFinally: () => unknown) => unknown;
  then: (onFulfilled: (value: T) => unknown, onRejected: (reason: E) => unknown) => unknown;
};
```

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:13](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/promise-cache.ts#L13)

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

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:25](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/promise-cache.ts#L25)

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

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:31](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/promise-cache.ts#L31)

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

Defined in: [warp-drive-packages/core/src/request/-private/promise-cache.ts:19](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/promise-cache.ts#L19)

Registers fulfillment/rejection handlers, `Promise.prototype.then`-style.

#### Parameters

##### onFulfilled

(`value`: `T`) => `unknown`

##### onRejected

(`reason`: `E`) => `unknown`

#### Returns

`unknown`
