---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/request/types/PostQueryRequestOptions.md
description: >-
  Shape of the `POST` or `QUERY` request object that `postQuery` builders
  return, with a body and a required cache key since the url cannot serve as
  one.
---

# &#x20;PostQueryRequestOptions\<RT = `unknown`>

```ts
type PostQueryRequestOptions<RT = unknown> = {
  body?:   | string
     | BodyInit
     | FormData;
  cacheOptions: CacheOptions & {
     key: string;
  };
  headers: Headers;
  method: "POST" | "QUERY";
  op: "query";
  url: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:212](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L212)

The request shape produced by the `postQuery` request builders, for
use with [Store.request](../../../classes/Store.md#request).

## Type Parameters

### RT

`RT` = `unknown`

## Properties

### body?

```ts
optional body?: 
  | string
  | BodyInit
  | FormData;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:228](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L228)

the body to send with the request

***

### cacheOptions

```ts
cacheOptions: CacheOptions & {
  key: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:233](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L233)

see [CacheOptions](CacheOptions.md). A `key` is required since `POST`/`QUERY`
requests otherwise have no cache-safe way to derive one from the url.

#### Type Declaration

##### key

```ts
key: string;
```

a key that uniquely identifies this request

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:224](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L224)

the headers to send with the request

***

### method

```ts
method: "POST" | "QUERY";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:220](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L220)

the HTTP method to use

***

### op

```ts
op: "query";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:242](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L242)

the name of the request operation

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:216](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/request.ts#L216)

the url to request
