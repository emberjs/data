---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/classes/RequestManager.md
description: >-
  Runs each request through a chain of handlers that can fulfill, modify, or
  pass it along, and returns a `Future` for the response.
---

# &#x20;RequestManager

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:104](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/manager.ts#L104)

## Import

```js
import { RequestManager } from '@warp-drive/core';
```

For complete usage guide see the [RequestManager Documentation](/guides/).

## How It Works

```ts
interface RequestManager {
  request<T>(req: RequestInfo): Future<T>;
}
```

A RequestManager provides a request/response flow in which configured
handlers are successively given the opportunity to handle, modify, or
pass-along a request.

For example:

::: code-group

```ts [Setup.ts]
import { RequestManager, Fetch } from '@warp-drive/core';
import { AutoCompress } from '@warp-drive/utilities/handlers';
import Auth from 'ember-simple-auth/handler';

// ... create manager
const manager = new RequestManager()
   .use([Auth, new AutoCompress(), Fetch]); // [!code focus]
```

```ts [Usage.ts]
import Config from './config';

const { apiUrl } = Config;

// ... execute a request
const response = await manager.request({
  url: `${apiUrl}/users`
});
```

:::

### Futures

The return value of `manager.request` is a `Future`, which allows
access to limited information about the request while it is still
pending and fulfills with the final state when the request completes.

A `Future` is cancellable via `abort`.

Handlers may optionally expose a `ReadableStream` to the `Future` for
streaming data; however, when doing so the future should not resolve
until the response stream is fully read.

```ts
interface Future<T> extends Promise<StructuredDocument<T>> {
  abort(): void;

  async getStream(): ReadableStream | null;
}
```

### StructuredDocuments

A Future resolves with a `StructuredDataDocument` or rejects with a `StructuredErrorDocument`.

```ts
interface StructuredDataDocument<T> {
  request: ImmutableRequestInfo;
  response: ImmutableResponseInfo;
  content: T;
}
interface StructuredErrorDocument extends Error {
  request: ImmutableRequestInfo;
  response: ImmutableResponseInfo;
  error: string | object;
}
type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument;
```

## Constructors

### Constructor

```ts
new RequestManager(options?: GenericCreateArgs): RequestManager;
```

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:121](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/manager.ts#L121)

#### Parameters

##### options?

`GenericCreateArgs`

#### Returns

`RequestManager`

## Methods

### request()

```ts
request<RT>(request: RequestInfo<RT>): Future<RT>;
```

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:197](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/manager.ts#L197)

Issue a Request.

Returns a Future that fulfills with a StructuredDocument

#### Type Parameters

##### RT

`RT`

#### Parameters

##### request

[`RequestInfo`](../types/request/types/RequestInfo.md)<`RT`>

#### Returns

[`Future`](../request/types/Future.md)<`RT`>

***

### use()

```ts
use(newHandlers: Handler[]): this;
```

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:163](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/manager.ts#L163)

Register handler(s) to use when a request is issued.

Handlers will be invoked in the order they are registered.
Each Handler is given the opportunity to handle the request,
curry the request, or pass along a modified request.

#### Parameters

##### newHandlers

[`Handler`](../request/types/Handler.md)\[]

#### Returns

`this`

***

### useCache()

```ts
useCache(cacheHandler: CacheHandler & {
  ___(unique) Symbol(IS_CACHE_HANDLER)?: true;
}): this;
```

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:137](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/request/-private/manager.ts#L137)

Register a handler to use for primary cache intercept.

Only one such handler may exist. If using the same
RequestManager as the Store instance the Store
registers itself as a Cache handler.

#### Parameters

##### cacheHandler

[`CacheHandler`](../request/types/CacheHandler.md) & {
`___(unique) Symbol(IS_CACHE_HANDLER)?`: `true`;
}

#### Returns

`this`
