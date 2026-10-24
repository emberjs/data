---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/request/types/CreateRequestOptions.md
---

# &#x20;CreateRequestOptions\<RT = `unknown`, T = `unknown`>

```ts
type CreateRequestOptions<RT = unknown, T = unknown> = {
  body?:   | string
     | BodyInit
     | FormData;
  data: {
     record: ResourceKey<TypeFromInstanceOrString<T>>;
  };
  headers: Headers;
  method: "POST";
  op: "createRecord";
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  url: string;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:321](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L321)

The request shape produced by the `createRecord` request builders, for
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

Defined in: [warp-drive-packages/core/src/types/request.ts:341](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L341)

the body to send with the request

***

### data

```ts
data: {
  record: ResourceKey<TypeFromInstanceOrString<T>>;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:345](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L345)

data for handlers to convert into the request body

#### record

```ts
record: ResourceKey<TypeFromInstanceOrString<T>>;
```

the resource being created

***

### headers

```ts
headers: Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:333](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L333)

the headers to send with the request

***

### method

```ts
method: "POST";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:329](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L329)

the HTTP method to use

***

### op

```ts
op: "createRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:337](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L337)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:354](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L354)

the resource being created

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:325](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L325)

the url to request
