---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/types/request/types/UpdateRequestOptions.md
description: >-
  Shape of the `PATCH` or `PUT` request object that `updateRecord` builders
  return for `store.request`, identifying the resource being saved.
---

# &#x20;UpdateRequestOptions\<RT = `unknown`, T = `unknown`>

```ts
type UpdateRequestOptions<RT = unknown, T = unknown> = {
  body?:   | string
     | BodyInit
     | FormData;
  data: {
     record: ResourceKey<TypeFromInstanceOrString<T>>;
  };
  headers: Headers;
  method: "PATCH" | "PUT";
  op: "updateRecord";
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  url: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:308](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L308)

The request shape produced by the `updateRecord` request builders, for
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

Defined in: [warp-drive-packages/core/src/types/request.ts:328](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L328)

the body to send with the request

***

### data

```ts
data: {
  record: ResourceKey<TypeFromInstanceOrString<T>>;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:332](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L332)

data for handlers to convert into the request body

#### record

```ts
record: ResourceKey<TypeFromInstanceOrString<T>>;
```

the resource being updated

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:320](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L320)

the headers to send with the request

***

### method

```ts
method: "PATCH" | "PUT";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:316](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L316)

the HTTP method to use

***

### op

```ts
op: "updateRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:324](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L324)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:341](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L341)

the resource being updated

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:312](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/request.ts#L312)

the url to request
