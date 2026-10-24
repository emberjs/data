---
url: >-
  /pr-preview/pr-11087/api/@warp-drive/core/types/request/types/PostQueryRequestOptions.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:187](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L187)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:203](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L203)

the body to send with the request

***

### cacheOptions

```ts
cacheOptions: CacheOptions & {
  key: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:208](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L208)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:199](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L199)

the headers to send with the request

***

### method

```ts
method: "POST" | "QUERY";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:195](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L195)

the HTTP method to use

***

### op

```ts
op: "query";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:217](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L217)

the name of the request operation

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:191](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/core/src/types/request.ts#L191)

the url to request
