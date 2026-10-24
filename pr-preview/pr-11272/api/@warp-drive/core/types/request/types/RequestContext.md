---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/request/types/RequestContext.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:764](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L764)

The object a [Handler](../../../request/types/Handler.md) uses to fulfill a request: it provides a
readonly view of the [request](#request) and methods
for supplying the [Future](../../../request/types/Future.md)'s stream and final response.

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

Defined in: [warp-drive-packages/core/src/types/request.ts:782](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L782)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:778](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L778)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:772](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L772)

a unique id for this request

***

### request

```ts
request: ImmutableRequestInfo;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:768](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L768)

#### See

[ImmutableRequestInfo](ImmutableRequestInfo.md)
