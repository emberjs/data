---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/request/types/FindRecordRequestOptions.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:121](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L121)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:137](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L137)

see [CacheOptions](CacheOptions.md)

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:133](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L133)

the headers to send with the request

***

### method

```ts
method: "GET";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:129](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L129)

the HTTP method to use

***

### op

```ts
op: "findRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:141](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L141)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:145](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L145)

the resource being requested

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:125](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/request.ts#L125)

the url to request
