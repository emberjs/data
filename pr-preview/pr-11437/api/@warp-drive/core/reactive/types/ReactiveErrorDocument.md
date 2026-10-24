---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/reactive/types/ReactiveErrorDocument.md
description: >-
  The shape of a reactive response document that carries `errors` and no primary
  `data`, such as the result of a failed request.
---

# &#x20;ReactiveErrorDocument\<T, EM *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`, E *extends* `object` = `object`, M *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `EM`>

```ts
type ReactiveErrorDocument<T, EM extends Meta | undefined = Meta | undefined, E extends object = object, M extends Meta | undefined = EM> = ReactiveDocumentBase<T, M, E, EM> & DocumentMeta<EM> & {
  data?: undefined;
  errors: E[];
};
```

Defined in: [warp-drive-packages/core/src/reactive/-private/document.ts:160](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/reactive/-private/document.ts#L160)

The variant of [ReactiveDocument](ReactiveDocument.md) returned for a request whose
response contained no primary data, e.g. an error response.

## Type Parameters

### T

`T`

### EM

`EM` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`

### E

`E` *extends* `object` = `object`

### M

`M` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `EM`

## Type Declaration

### data?

```ts
readonly optional data?: undefined;
```

The primary data for this document, if any.

If this document has no primary data (e.g. because it is an error document)
this property will be `undefined`.

For collections this will be an array of record instances,
for single resource requests it will be a single record instance or null.

### errors

```ts
readonly errors: E[];
```

The errors returned by the API for this request, if any

The cache stores whatever the API sent without validating it, so by
default this is `object` — no shape is promised. Requests that know what
their endpoint returns may narrow it by supplying the `E` type param.
