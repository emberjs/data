---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/request/types/UpdateRequestOptions.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:277](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L277)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:297](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L297)

the body to send with the request

***

### data

```ts
data: {
  record: ResourceKey<TypeFromInstanceOrString<T>>;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:301](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L301)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:289](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L289)

the headers to send with the request

***

### method

```ts
method: "PATCH" | "PUT";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:285](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L285)

the HTTP method to use

***

### op

```ts
op: "updateRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:293](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L293)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:310](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L310)

the resource being updated

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:281](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/request.ts#L281)

the url to request
