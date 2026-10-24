---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/reactive/types/PendingRequest.md
---

# &#x20;PendingRequest

```ts
interface PendingRequest extends PendingPromise {
  error: null;
  isCancelled: false;
  isError: false;
  isLoading: true;
  isPending: true;
  isSuccess: false;
  loadingState: RequestLoadingState;
  reason: null;
  request: null;
  response: null;
  result: null;
  status: "pending";
  value: null;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:355](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-state.ts#L355)

The state of a request in the "pending"
state. This is the default initial state.

Extends the [PendingPromise](PendingPromise.md) interface.

## Extends

* [`PendingPromise`](PendingPromise.md)

## Properties

### ~~error~~&#x20;

```ts
error: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:71](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L71)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`error`](PendingPromise.md#error)

***

### isCancelled

```ts
isCancelled: false;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:360](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-state.ts#L360)

Whether the request is cancelled.

***

### isError

```ts
isError: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:48](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L48)

Whether the promise has rejected
with an error.

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`isError`](PendingPromise.md#iserror)

***

### ~~isLoading~~&#x20;

```ts
isLoading: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:34](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L34)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`isLoading`](PendingPromise.md#isloading)

***

### isPending

```ts
isPending: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:27](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L27)

Whether the promise is pending.

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`isPending`](PendingPromise.md#ispending)

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:41](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L41)

Whether the promise has resolved
successfully.

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`isSuccess`](PendingPromise.md#issuccess)

***

### loadingState

```ts
loadingState: RequestLoadingState;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:362](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-state.ts#L362)

***

### reason

```ts
reason: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:78](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L78)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`reason`](PendingPromise.md#reason)

***

### request

```ts
request: null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:363](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-state.ts#L363)

***

### response

```ts
response: null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:364](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/request-state.ts#L364)

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:62](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L62)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`result`](PendingPromise.md#result)

***

### status

```ts
status: "pending";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:21](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L21)

The status of the promise.

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`status`](PendingPromise.md#status)

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:55](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/signals/promise-state.ts#L55)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Inherited from

[`PendingPromise`](PendingPromise.md).[`value`](PendingPromise.md#value)
