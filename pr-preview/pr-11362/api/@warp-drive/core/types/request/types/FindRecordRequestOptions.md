---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/types/request/types/FindRecordRequestOptions.md
description: >-
  Shape of the `GET` request object that `findRecord` builders return for
  `store.request`, carrying the url, headers, and requested resource identifier.
---

# &#x20;FindRecordRequestOptions\<RT = `unknown`, T = `unknown`>

```ts
type FindRecordRequestOptions<RT = unknown, T = unknown> = {
  cacheOptions?: CacheOptions;
  headers: Headers;
  method: "GET";
  op: "findRecord";
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  url: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:140](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L140)

The request shape produced by the `findRecord` request builders, for
use with [Store.request](../../../classes/Store.md#request).

## Type Parameters

### RT

`RT` = `unknown`

### T

`T` = `unknown`

## Properties

### cacheOptions?

```ts
optional cacheOptions?: CacheOptions;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:156](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L156)

see [CacheOptions](CacheOptions.md)

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:152](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L152)

the headers to send with the request

***

### method

```ts
method: "GET";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:148](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L148)

the HTTP method to use

***

### op

```ts
op: "findRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:160](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L160)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:164](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L164)

the resource being requested

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:144](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/request.ts#L144)

the url to request
