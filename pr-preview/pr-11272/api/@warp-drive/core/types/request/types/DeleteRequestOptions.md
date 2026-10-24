---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/request/types/DeleteRequestOptions.md
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

Defined in: [warp-drive-packages/core/src/types/request.ts:228](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L228)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:248](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L248)

the body to send with the request

***

### data

```ts
data: {
  record: ResourceKey<TypeFromInstanceOrString<T>>;
};
```

Defined in: [warp-drive-packages/core/src/types/request.ts:252](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L252)

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

Defined in: [warp-drive-packages/core/src/types/request.ts:240](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L240)

the headers to send with the request

***

### method

```ts
method: "DELETE";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:236](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L236)

the HTTP method to use

***

### op

```ts
op: "deleteRecord";
```

Defined in: [warp-drive-packages/core/src/types/request.ts:244](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L244)

the name of the request operation

***

### records

```ts
records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:261](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L261)

the resource being deleted

***

### url

```ts
url: string;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:232](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L232)

the url to request
