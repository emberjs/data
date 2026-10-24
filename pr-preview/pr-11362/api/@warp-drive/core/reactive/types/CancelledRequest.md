---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/reactive/types/CancelledRequest.md
---

# &#x20;CancelledRequest\<RT, E *extends* [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md) = [`StructuredErrorDocument`](../../types/request/types/StructuredErrorDocument.md)>

```ts
interface CancelledRequest<RT, E extends StructuredErrorDocument = StructuredErrorDocument> {
  error: E;
  isCancelled: true;
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
  status: "cancelled";
  value: null;
  refresh(usePolicy?: boolean): Future<RT>;
  reload(): Future<RT>;
}
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:494](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L494)

The state of a request that was aborted before it settled.

A cancelled request has `status: 'cancelled'` and its `reason` is an
`AbortError`. `isError` is also `true`, as for a [RejectedRequest](RejectedRequest.md),
so check `status` or `isCancelled` to tell the two apart.

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:530](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L530)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:512](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L512)

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

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:585](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L585)

Once the request has rejected, this will
be the error the request rejected with.

#### Deprecated

use `reason` instead

***

### isCancelled

```ts
isCancelled: true;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:598](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L598)

Whether the request is cancelled.

***

### isError

```ts
isError: true;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:562](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L562)

Whether the request has rejected
with an error.

***

### isLoading

```ts
isLoading: false;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:548](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L548)

Whether the request is pending.

***

### isPending

```ts
isPending: false;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:542](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L542)

Whether the request is pending.

***

### isSuccess

```ts
isSuccess: false;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:555](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L555)

Whether the request has resolved
successfully.

***

### loadingState

```ts
loadingState: RequestLoadingState;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:600](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L600)

***

### reason

```ts
reason: E;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:592](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L592)

Once the request has rejected, this will
be the error the request rejected with.

***

### request

```ts
request: 
  | ImmutableRequestInfo<RT>
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:601](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L601)

***

### response

```ts
response: 
  | Response
  | ResponseInfo
  | null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:602](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L602)

***

### ~~result~~&#x20;

```ts
result: null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:576](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L576)

Once the request has resolved, this will
be the value the request resolved to.

#### Deprecated

use `value` instead

***

### status

```ts
status: "cancelled";
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:536](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L536)

The status of the request.

***

### value

```ts
value: null;
```

Defined in: [warp-drive-packages/core/src/signals/request-state.ts:569](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/signals/request-state.ts#L569)

Once the request has resolved, this will
be the value the request resolved to.
