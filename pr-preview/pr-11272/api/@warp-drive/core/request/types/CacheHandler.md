---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/request/types/CacheHandler.md
---

# &#x20;CacheHandler

```ts
interface CacheHandler {
  request<T = unknown>(context: RequestContext, next: NextFn<T>): 
  | T
  | Promise<
  | T
  | StructuredDataDocument<T>>
  | Future<T>;
}
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:270](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/request/-private/types.ts#L270)

The CacheHandler is identical to other handlers except that it
is allowed to return a value synchronously. This is useful for
features like reducing microtask queueing when de-duping.

A RequestManager may only have one CacheHandler, registered via
`manager.useCache(CacheHandler)`.

## Methods

### request()

```ts
request<T = unknown>(context: RequestContext, next: NextFn<T>): 
  | T
  | Promise<
  | T
  | StructuredDataDocument<T>>
| Future<T>;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:278](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/request/-private/types.ts#L278)

Method to implement to handle requests. Receives the request
context and a nextFn to call to pass-along the request to
other handlers.

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### context

[`RequestContext`](../../types/request/types/RequestContext.md)

##### next

[`NextFn`](NextFn.md)<`T`>

#### Returns

| `T`
| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<
| `T`
| [`StructuredDataDocument`](../../types/request/types/StructuredDataDocument.md)<`T`>>
| [`Future`](Future.md)<`T`>
