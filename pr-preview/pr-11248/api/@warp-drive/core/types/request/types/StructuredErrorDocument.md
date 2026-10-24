---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/request/types/StructuredErrorDocument.md
description: >-
  The Error a request's `Future` rejects with when the request fails, carrying
  the `request`, `response`, `error`, and any `content` received.
---

# &#x20;StructuredErrorDocument\<T = `unknown`>

```ts
interface StructuredErrorDocument<T = unknown> extends Error {
  cause?: unknown;
  content?: T;
  error: string | object;
  message: string;
  name: string;
  request: ImmutableRequestInfo;
  response: 
  | Response
  | ResponseInfo
  | null;
  stack?: string;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:531](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/request.ts#L531)

When a [Future](../../../request/types/Future.md) rejects, it throws either an [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)
an [AggregateError](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/AggregateError) or a [DOMException](https://developer.mozilla.org/docs/Web/API/DOMException) that maintains
the `{ request, response, content }` shape but is also an Error instance
itself.

If using the error originates from the [Fetch Handler](../../../variables/Fetch.md)
the error will be a [FetchError](FetchError.md)

## Extends

* [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)

## Type Parameters

### T

`T` = `unknown`

## Properties

### cause?

```ts
optional cause?: unknown;
```

#### Inherited from

```ts
Error.cause
```

***

### content?

```ts
optional content?: T;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:551](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/request.ts#L551)

the processed content of the response, if any was received before the failure

***

### error

```ts
error: string | object;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:547](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/request.ts#L547)

the error that caused the request to fail

***

### message

```ts
message: string;
```

#### Inherited from

```ts
Error.message
```

***

### name

```ts
name: string;
```

#### Inherited from

```ts
Error.name
```

***

### request

```ts
request: ImmutableRequestInfo;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:539](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/request.ts#L539)

#### See

[ImmutableRequestInfo](ImmutableRequestInfo.md)

***

### response

```ts
response: 
  | Response
  | ResponseInfo
  | null;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:543](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/request.ts#L543)

the response set by the handler chain, if any

***

### stack?

```ts
optional stack?: string;
```

#### Inherited from

```ts
Error.stack
```
