---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/request/types/StructuredErrorDocument.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:473](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/request.ts#L473)

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

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:24](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2022.error.d.ts#L24)

#### Inherited from

```ts
Error.cause
```

***

### content?

```ts
optional content?: T;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:493](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/request.ts#L493)

the processed content of the response, if any was received before the failure

***

### error

```ts
error: string | object;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:489](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/request.ts#L489)

the error that caused the request to fail

***

### message

```ts
message: string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1075](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1075)

#### Inherited from

```ts
Error.message
```

***

### name

```ts
name: string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1074](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1074)

#### Inherited from

```ts
Error.name
```

***

### request

```ts
request: ImmutableRequestInfo;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:481](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/request.ts#L481)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:485](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/request.ts#L485)

the response set by the handler chain, if any

***

### stack?

```ts
optional stack?: string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1076](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1076)

#### Inherited from

```ts
Error.stack
```
