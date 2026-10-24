---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/reactive/types/RejectedRequest.md
---

# &#x20;RejectedRequest\<RT, E *extends* [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md) = [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md)>

```ts
interface RejectedRequest<RT, E extends StructuredErrorDocument = StructuredErrorDocument> extends RejectedPromise<E> {
  error: E;
  isCancelled: false;
  isError: true;
  isLoading: false;
  isPending: false;
  isSuccess: false;
  loadingState: RequestLoadingState;
  reason: E;
  request: 
  | ImmutableRequestInfo<RT>
  | null;
  response: 
  | Response
  | ResponseInfo
  | null;
  result: null;
  status: "rejected";
  value: null;
  refresh(usePolicy?: boolean): Future<RT>;
  reload(): Future<RT>;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:435](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L435)

The state of a request in the "rejected" state.
This is the state of a request that has rejected
with an error.

Extends the [RejectedPromise](RejectedPromise.md) interface.

## Extends

* [`RejectedPromise`](RejectedPromise.md)<`E`>

## Type Parameters

### RT

`RT`

### E

`E` *extends* [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md) = [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md)

## Methods

### refresh()

```ts
refresh(usePolicy?: boolean): Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:474](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L474)

Retries the request with low (non-blocking) priority. This is the
same as having passed `cacheOptions.backgroundReload = true` on the original
request.

This will not change the existing request's state. To subscribe
to the new request's state, use `getRequestState` on the returned
[Future](../../request/types/Future.md).

```ts
const future = state.reload();
const state = getRequestState(future);
```

It is safe to pass this around as an "action" or "event" handler
as its context is bound.

#### Parameters

##### usePolicy?

`boolean`

#### Returns

[`Future`](../../request/types/Future.md)<`RT`>

***

### reload()

```ts
reload(): Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:456](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L456)

Retries the request with high (blocking) priority. This is the
same as having passed `cacheOptions.reload = true` on the original
request.

This will not change the existing request's state. To subscribe
to the new request's state, use `getRequestState` on the returned
[Future](../../request/types/Future.md).

```ts
const future = state.reload();
const state = getRequestState(future);
```

It is safe to pass this around as an "action" or "event" handler
as its context is bound.

#### Returns

[`Future`](../../request/types/Future.md)<`RT`>

## Properties

### ~~error~~&#x20;

```ts
error: E;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:218](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L218)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`error`](RejectedPromise.md#error)

***

### isCancelled

```ts
isCancelled: false;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:480](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L480)

Whether the request is cancelled.

***

### isError

```ts
isError: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:194](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L194)

Whether the promise has rejected
with an error.

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`isError`](RejectedPromise.md#iserror)

***

### ~~isLoading~~&#x20;

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:180](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L180)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`isLoading`](RejectedPromise.md#isloading)

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:173](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L173)

Whether the promise is pending.

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`isPending`](RejectedPromise.md#ispending)

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:187](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L187)

Whether the promise has resolved
successfully.

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`isSuccess`](RejectedPromise.md#issuccess)

***

### loadingState

```ts
loadingState: RequestLoadingState;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:482](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L482)

***

### reason

```ts
reason: E;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:225](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L225)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`reason`](RejectedPromise.md#reason)

***

### request

```ts
request: 
  | ImmutableRequestInfo<RT>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:483](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L483)

***

### response

```ts
response: 
  | Response
  | ResponseInfo
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:484](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/request-state.ts#L484)

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:209](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L209)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`result`](RejectedPromise.md#result)

***

### status

```ts
status: "rejected";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:167](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L167)

The status of the promise.

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`status`](RejectedPromise.md#status)

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:201](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/signals/promise-state.ts#L201)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Inherited from

[`RejectedPromise`](RejectedPromise.md).[`value`](RejectedPromise.md#value)
