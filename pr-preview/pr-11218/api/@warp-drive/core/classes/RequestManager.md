---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/classes/RequestManager.md
description: >-
  Runs each request through a chain of handlers that can fulfill, modify, or
  pass it along, and returns a `Future` for the response.
---

# &#x20;RequestManager

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:149](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/request/-private/manager.ts#L149)

## Import

```js
import { RequestManager } from '@warp-drive/core';
```

For a complete usage guide see [Making Requests](/guides/the-manual/requests/), and
[Handlers](/guides/the-manual/requests/handlers) for writing the handlers it runs.

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
import { AuthHandler } from './auth-handler';

// ... create manager
const manager = new RequestManager()
   .use([AuthHandler, new AutoCompress(), Fetch]); // [!code focus]
```

```ts [auth-handler.ts]
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { RequestContext } from '@warp-drive/core/types/request';

const token = '<token>';

// adds a bearer token to every request, then passes it along
export const AuthHandler: Handler = {
  request<T>(context: RequestContext, next: NextFn<T>) {
    const headers = new Headers(context.request.headers);
    headers.append('Authorization', `Bearer ${token}`);

    return next(Object.assign({}, context.request, { headers }));
  },
};
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

### RequestManager vs [Store.request](Store.md#request)

A bare `RequestManager` is the low-level primitive: it runs a request through the configured
[handler chain](../request/types/Handler.md) and settles with the raw [StructuredDocument](../types/request/types/StructuredDocument.md). It has no
cache and does not hydrate [ReactiveDocuments](../reactive/types/ReactiveDocument.md) unless you register a
cache handler yourself via [RequestManager.useCache](#usecache) and the request opts in.

[Store.request](Store.md#request) issues requests through this same `RequestManager`, but with the Store's
cache handler and hydration already wired up — inserting the response into the Store's cache
and resolving with a `ReactiveDocument` instead. Use `store.request` for anything the Store's
cache should own, which is nearly all app code. Reach for `requestManager.request` directly
only when there is no [Store](Store.md) involved, or you specifically want the unprocessed
`StructuredDocument`.

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

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:166](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/request/-private/manager.ts#L166)

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

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:258](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/request/-private/manager.ts#L258)

Issue a Request.

Runs `request` through the configured [handler chain](../request/types/Handler.md) and settles with the
[StructuredDocument](../types/request/types/StructuredDocument.md) the chain produces — a plain `{ request, response, content }`
object, not a [ReactiveDocument](../reactive/types/ReactiveDocument.md). Caching and hydration only happen if a cache handler
has been registered via [RequestManager.useCache](#usecache) and the request opts in; a
`RequestManager` created on its own has neither.

Most app code should use [Store.request](Store.md#request) instead, which calls this same method with
the Store's cache handler and hydration already configured. Reach for `requestManager.request`
directly when there is no [Store](Store.md) involved, or when you want the unprocessed
`StructuredDocument`. The `<RT>` generic can be set explicitly or inferred from a request
built with [withResponseType](../request/functions/withResponseType.md) or [withReactiveResponse](../request/functions/withReactiveResponse.md) — see
[Typing Requests](/guides/the-manual/requests/typing-requests.md).

#### Type Parameters

##### RT

`RT`

#### Parameters

##### request

[`RequestInfo`](../types/request/types/RequestInfo.md)<`RT`>

#### Returns

[`Future`](../request/types/Future.md)<`RT`>

#### Example

```ts
const { content } = await requestManager.request({ url: '/users' });
```

***

### use()

```ts
use(newHandlers: Handler[]): this;
```

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:208](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/request/-private/manager.ts#L208)

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

Defined in: [warp-drive-packages/core/src/request/-private/manager.ts:182](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/request/-private/manager.ts#L182)

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
