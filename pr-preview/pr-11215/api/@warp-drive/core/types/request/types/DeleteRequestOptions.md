---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/request/types/DeleteRequestOptions.md
description: >-
  Shape of the `DELETE` request object that `deleteRecord` builders return for
  `store.request`, identifying the resource being deleted.
---

# &#x20;DeleteRequestOptions\<RT = `unknown`, T = `unknown`>

```ts
type DeleteRequestOptions<RT = unknown, T = unknown> = {
  body?:   | string
     | BodyInit
     | FormData;
  data: {
     record: ResourceKey<TypeFromInstanceOrString<T>>;
  };
  headers: Headers;
  method: "DELETE";
  op: "deleteRecord";
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  url: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:256](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L256)

The request shape produced by the `deleteRecord` request builders, for
use with [Store.request](../../../classes/Store.md#request).

## Type Parameters

### RT

`RT` = `unknown`

### T

`T` = `unknown`

## Properties

### body?

```ts
optional body?: 
  | string
  | BodyInit
  | FormData;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:276](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L276)

the body to send with the request

***

### data

```ts
data: {
  record: ResourceKey<TypeFromInstanceOrString<T>>;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:280](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L280)

data for handlers to convert into the request body

#### record

```ts
record: ResourceKey<TypeFromInstanceOrString<T>>;
```

the resource being deleted

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:268](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L268)

the headers to send with the request

***

### method

```ts
method: "DELETE";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:264](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L264)

the HTTP method to use

***

### op

```ts
op: "deleteRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:272](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L272)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:289](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L289)

the resource being deleted

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:260](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/request.ts#L260)

the url to request
