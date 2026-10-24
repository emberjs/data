---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/StoreRequestContext.md
---

# &#x20;StoreRequestContext

```ts
interface StoreRequestContext extends RequestContext {
  id: number;
  request: Readonly<Omit<RequestInfo<unknown>, "controller">> & {
  bodyUsed?: boolean;
  cacheOptions?: Readonly<CacheOptions>;
  data?: Readonly<Record<string, unknown>>;
  headers?: ImmutableHeaders;
  options?: Readonly<Record<string, unknown>>;
} & {
  store: Store;
};
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

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/handler.ts:49](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/cache-handler/handler.ts#L49)

The object a [Handler](../request/types/Handler.md) uses to fulfill a request: it provides a
readonly view of the [request](request/types/RequestContext.md#request) and methods
for supplying the [Future](../request/types/Future.md)'s stream and final response.

## Extends

* [`RequestContext`](request/types/RequestContext.md)

## Methods

### setResponse()

```ts
setResponse(response: 
  | Response
  | ResponseInfo
  | null): void;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:782](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L782)

Supplies the response for the request.

#### Parameters

##### response

| [`Response`](https://developer.mozilla.org/docs/Web/API/Response)
| [`ResponseInfo`](request/types/ResponseInfo.md)
| `null`

#### Returns

`void`

#### Inherited from

[`RequestContext`](request/types/RequestContext.md).[`setResponse`](request/types/RequestContext.md#setresponse)

***

### setStream()

```ts
setStream(stream: 
  | ReadableStream<any>
  | Promise<
  | ReadableStream<any>
  | null>): void;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:778](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L778)

Supplies the stream of the response's content, if available, enabling
consumers to monitor download progress via [RequestLoadingState](../reactive/types/RequestLoadingState.md).

#### Parameters

##### stream

| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<
| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)<`any`>
| `null`>

#### Returns

`void`

#### Inherited from

[`RequestContext`](request/types/RequestContext.md).[`setStream`](request/types/RequestContext.md#setstream)

## Properties

### id

```ts
id: number;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:772](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L772)

a unique id for this request

#### Inherited from

[`RequestContext`](request/types/RequestContext.md).[`id`](request/types/RequestContext.md#id)

***

### request

```ts
request: Readonly<Omit<RequestInfo<unknown>, "controller">> & {
  bodyUsed?: boolean;
  cacheOptions?: Readonly<CacheOptions>;
  data?: Readonly<Record<string, unknown>>;
  headers?: ImmutableHeaders;
  options?: Readonly<Record<string, unknown>>;
} & {
  store: Store;
};
```

Defined in: [warp-drive-packages/core/src/store/-private/cache-handler/handler.ts:50](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/store/-private/cache-handler/handler.ts#L50)

#### Type Declaration

##### bodyUsed?

```ts
readonly optional bodyUsed?: boolean;
```

Whether the request body has been read.

##### cacheOptions?

```ts
readonly optional cacheOptions?: Readonly<CacheOptions>;
```

see [CacheOptions](request/types/CacheOptions.md)

##### data?

```ts
readonly optional data?: Readonly<Record<string, unknown>>;
```

see [RequestInfo.data](request/types/RequestInfo.md#data)

##### headers?

```ts
readonly optional headers?: ImmutableHeaders;
```

see [ImmutableHeaders](request/types/ImmutableHeaders.md)

##### options?

```ts
readonly optional options?: Readonly<Record<string, unknown>>;
```

see [RequestInfo.options](request/types/RequestInfo.md#options)

#### Type Declaration

##### store

```ts
store: Store;
```

the store instance the request was issued through, used to enable store-aware cache handling.

#### See

[ImmutableRequestInfo](request/types/ImmutableRequestInfo.md)

#### Overrides

[`RequestContext`](request/types/RequestContext.md).[`request`](request/types/RequestContext.md#request)
