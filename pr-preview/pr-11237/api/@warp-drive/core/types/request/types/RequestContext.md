---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/core/types/request/types/RequestContext.md
description: >-
  Object passed to each request handler with the immutable request, a request
  id, and methods for setting the response stream and the response.
---

# &#x20;RequestContext

```ts
interface RequestContext {
  id: number;
  request: ImmutableRequestInfo;
  setResponse(response: 
  | Response
  | ResponseInfo
  | null): void;
  setStream(stream: 
  | ReadableStream<any>
  | Promise<
  | ReadableStream<any>
  | null>): void;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:845](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/request.ts#L845)

The object a [Handler](../../../request/types/Handler.md) uses to fulfill a request: it provides a
readonly view of the [request](#request) and methods
for supplying the [Future](../../../request/types/Future.md)'s stream and final response.

The [Handlers](/guides/the-manual/requests/handlers) guide shows a handler using it.

## Extended by

* [`StoreRequestContext`](../../StoreRequestContext.md)

## Methods

### setResponse()

```ts
setResponse(response: 
  | Response
  | ResponseInfo
  | null): void;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:863](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/request.ts#L863)

Supplies the response for the request.

#### Parameters

##### response

| [`Response`](https://developer.mozilla.org/docs/Web/API/Response)
| [`ResponseInfo`](ResponseInfo.md)
| `null`

#### Returns

`void`

***

### setStream()

```ts
setStream(stream: 
  | ReadableStream<any>
  | Promise<
  | ReadableStream<any>
  | null>): void;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:859](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/request.ts#L859)

Supplies the stream of the response's content, if available, enabling
consumers to monitor download progress via [RequestLoadingState](../../../reactive/types/RequestLoadingState.md).

#### Parameters

##### stream

| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<
| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| `null`>

#### Returns

`void`

## Properties

### id

```ts
id: number;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:853](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/request.ts#L853)

a unique id for this request

***

### request

```ts
request: ImmutableRequestInfo;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:849](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/core/src/types/request.ts#L849)

#### See

[ImmutableRequestInfo](ImmutableRequestInfo.md)
