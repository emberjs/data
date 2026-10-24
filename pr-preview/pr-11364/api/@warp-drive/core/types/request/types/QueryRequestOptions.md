---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/request/types/QueryRequestOptions.md
description: >-
  Shape of the `GET` request object that `query` builders return for
  `store.request`, carrying the url, headers, and cache options.
---

# &#x20;QueryRequestOptions\<RT = `unknown`>

```ts
type QueryRequestOptions<RT = unknown> = {
  cacheOptions?: CacheOptions;
  headers: Headers;
  method: "GET";
  op: "query";
  url: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:178](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/request.ts#L178)

The request shape produced by the `query` request builders, for
use with [Store.request](../../../classes/Store.md#request).

## Type Parameters

### RT

`RT` = `unknown`

## Properties

### cacheOptions?

```ts
optional cacheOptions?: CacheOptions;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:194](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/request.ts#L194)

see [CacheOptions](CacheOptions.md)

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:190](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/request.ts#L190)

the headers to send with the request

***

### method

```ts
method: "GET";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:186](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/request.ts#L186)

the HTTP method to use

***

### op

```ts
op: "query";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:198](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/request.ts#L198)

the name of the request operation

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:182](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/request.ts#L182)

the url to request
