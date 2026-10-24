---
url: /pr-preview/pr-11087/api/@warp-drive/core/request/types/Context.md
---

# &#x20;Context

```ts
interface Context {
  id: number;
  request: ImmutableRequestInfo;
  get hasRequestedStream(): boolean;
  setIdentifier(identifier: RequestKey): void;
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

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:167](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L167)

The context object given to each [Handler](Handler.md) (or [CacheHandler](CacheHandler.md))
as it processes a request. It exposes the (immutable, enhanced) request
along with the methods a handler uses to build up the [Future](Future.md) and
StructuredDataDocument that will ultimately be returned by the
[RequestManager](../../classes/RequestManager.md).

## Methods

### setIdentifier()

```ts
setIdentifier(identifier: RequestKey): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:223](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L223)

Associate a [RequestKey](../../types/identifier/types/RequestKey.md) with this request. May only be called
synchronously from a [CacheHandler](CacheHandler.md).

#### Parameters

##### identifier

[`RequestKey`](../../types/identifier/types/RequestKey.md)

#### Returns

`void`

***

### setResponse()

```ts
setResponse(response: 
  | Response
  | ResponseInfo
  | null): void;
```

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:213](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L213)

Set the [ResponseInfo](../../types/request/types/ResponseInfo.md) (or raw `Response`) associated with this
request. Used to populate the response information available on the
resulting StructuredDataDocument.

#### Parameters

##### response

| [`Response`](https://developer.mozilla.org/docs/Web/API/Response)
| [`ResponseInfo`](../../types/request/types/ResponseInfo.md)
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

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:203](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L203)

Set the response stream for this request. May be called at most once,
and may be called at any point up until the handler's `request` method
resolves.

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

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:183](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L183)

The id of this request as assigned by the [RequestManager](../../classes/RequestManager.md). Not
unique across manager instances.

***

### request

```ts
request: ImmutableRequestInfo;
```

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:176](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L176)

A readonly, immutable version of the request being handled, including
any defaults or enhancements applied by the [RequestManager](../../classes/RequestManager.md).

### hasRequestedStream

#### Get Signature

```ts
get hasRequestedStream(): boolean;
```

Defined in: [warp-drive-packages/core/src/request/-private/context.ts:238](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/request/-private/context.ts#L238)

Whether the application (or a downstream handler) has requested access
to the response stream via [Future.getStream](Future.md#getstream). Handlers can use
this to avoid the cost of streaming when nothing will consume it.

##### Returns

`boolean`
