---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/reactive/types/ReactiveErrorDocument.md
---

# &#x20;ReactiveErrorDocument\<T, EM *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`, E *extends* `object` = `object`, M *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `EM`>

```ts
type ReactiveErrorDocument<T, EM extends Meta | undefined = Meta | undefined, E extends object = object, M extends Meta | undefined = EM> = ReactiveDocumentBase<T, M, E, EM> & DocumentMeta<EM> & {
  data?: undefined;
  errors: E[];
};
```

Defined in: [warp-drive-packages/core/src/reactive/-private/document.ts:158](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/reactive/-private/document.ts#L158)

The variant of [ReactiveDocument](ReactiveDocument.md) returned for a request whose
response contained no primary data, e.g. an error response.

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

## Type Parameters

### T

`T`

### EM

`EM` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`

### E

`E` *extends* `object` = `object`

### M

`M` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `EM`
