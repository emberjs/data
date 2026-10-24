---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/reactive/types/ResolvedRequest.md
---

# &#x20;ResolvedRequest\<RT>

```ts
interface ResolvedRequest<RT> extends ResolvedPromise<RT> {
  error: null;
  isCancelled: false;
  isError: false;
  isLoading: false;
  isPending: false;
  isSuccess: true;
  loadingState: RequestLoadingState;
  reason: null;
  request: 
  | ImmutableRequestInfo<RT>
  | null;
  response: 
  | Response
  | ResponseInfo
  | null;
  result: RT;
  status: "fulfilled";
  value: RT;
  refresh(usePolicy?: boolean): Future<RT>;
  reload(): Future<RT>;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:374](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L374)

The state of a request in the "fulfilled" state.
This is the state of a request that has resolved
successfully.

Extends the [ResolvedPromise](ResolvedPromise.md) interface.

## Extends

* [`ResolvedPromise`](ResolvedPromise.md)<`RT`>

## Type Parameters

### RT

`RT`

## Methods

### refresh()

```ts
refresh(usePolicy?: boolean): Future<RT>;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:410](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L410)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:392](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L392)

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
error: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:144](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L144)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Deprecated

use `reason` instead

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`error`](ResolvedPromise.md#error)

***

### isCancelled

```ts
isCancelled: false;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:416](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L416)

Whether the request is cancelled.

***

### isError

```ts
isError: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:120](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L120)

Whether the promise has rejected
with an error.

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`isError`](ResolvedPromise.md#iserror)

***

### ~~isLoading~~&#x20;

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:107](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L107)

Whether the promise is pending.

#### Deprecated

use `isPending` instead

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`isLoading`](ResolvedPromise.md#isloading)

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:100](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L100)

Whether the promise is pending.

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`isPending`](ResolvedPromise.md#ispending)

***

### isSuccess

```ts
isSuccess: true;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:113](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L113)

Whether the promise has resolved
successfully.

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`isSuccess`](ResolvedPromise.md#issuccess)

***

### loadingState

```ts
loadingState: RequestLoadingState;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:423](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L423)

A lazily created [RequestLoadingState](RequestLoadingState.md) instance
which provides a number of reactive properties that can be used
to build UIs that respond to the progress of a request.

***

### reason

```ts
reason: null;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:151](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L151)

Once the promise has rejected, this will
be the error the promise rejected with.

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`reason`](ResolvedPromise.md#reason)

***

### request

```ts
request: 
  | ImmutableRequestInfo<RT>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:424](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L424)

***

### response

```ts
response: 
  | Response
  | ResponseInfo
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:425](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/request-state.ts#L425)

***

### ~~result~~&#x20;

```ts
result: RT;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:135](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L135)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Deprecated

use `value` instead

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`result`](ResolvedPromise.md#result)

***

### status

```ts
status: "fulfilled";
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:94](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L94)

The status of the promise.

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`status`](ResolvedPromise.md#status)

***

### value

```ts
value: RT;
```

Defined in: [warp-drive-packages/core/src/signals/promise-state.ts:127](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/signals/promise-state.ts#L127)

Once the promise has resolved, this will
be the value the promise resolved to.

#### Inherited from

[`ResolvedPromise`](ResolvedPromise.md).[`value`](ResolvedPromise.md#value)
