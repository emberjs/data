---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/core/request/types/NextFn.md
description: >-
  The function a request handler calls to pass a request to the next handler in
  the chain, returning a `Future` for its response.
---

# &#x20;NextFn\<P = `unknown`>

```ts
type NextFn<P = unknown> = (req: RequestInfo) => Future<P>;
```

Defined in: [warp-drive-packages/core/src/request/-private/types.ts:151](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/core/src/request/-private/types.ts#L151)

The `next` function passed to a [Handler](Handler.md) (or [CacheHandler](CacheHandler.md)),
used to forward a request to the next handler in the chain. Resolves to a
[Future](Future.md) carrying the downstream response.

The [Handlers](/guides/the-manual/requests/handlers) guide shows a handler calling it.

## Type Parameters

### P

`P` = `unknown`

## Parameters

### req

[`RequestInfo`](../../types/request/types/RequestInfo.md)

## Returns

[`Future`](Future.md)<`P`>
