---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/reactive/types/ReactiveDataDocument.md
description: >-
  The shape of a reactive response document whose `data` holds the request's
  primary records, with no `errors`.
---

# &#x20;ReactiveDataDocument\<T, M *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`, E *extends* `object` = `object`, EM *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `M`>

```ts
type ReactiveDataDocument<T, M extends Meta | undefined = Meta | undefined, E extends object = object, EM extends Meta | undefined = M> = ReactiveDocumentBase<T, M, E, EM> & DocumentMeta<M> & {
  data: T;
  errors?: undefined;
};
```

Defined in: [warp-drive-packages/core/src/reactive/-private/document.ts:200](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/reactive/-private/document.ts#L200)

The variant of [ReactiveDocument](ReactiveDocument.md) returned for a request whose
response contained primary data.

## Type Declaration

### data

```ts
readonly data: T;
```

The primary data for this document, if any.

If this document has no primary data (e.g. because it is an error document)
this property will be `undefined`.

For collections this will be an array of record instances,
for single resource requests it will be a single record instance or null.

### errors?

```ts
readonly optional errors?: undefined;
```

The errors returned by the API for this request, if any

## Type Parameters

### T

`T`

### M

`M` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`

### E

`E` *extends* `object` = `object`

### EM

`EM` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `M`
