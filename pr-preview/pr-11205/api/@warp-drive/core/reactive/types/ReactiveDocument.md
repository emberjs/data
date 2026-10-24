---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/reactive/types/ReactiveDocument.md
---

# &#x20;ReactiveDocument\<T, M *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`, E *extends* `object` = `object`, EM *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `M`>

```ts
type ReactiveDocument<T, M extends Meta | undefined = Meta | undefined, E extends object = object, EM extends Meta | undefined = M> = 
  | ReactiveDataDocument<T, M, E, EM>
| ReactiveErrorDocument<T, EM, E, M>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/document.ts:258](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/reactive/-private/document.ts#L258)

A Document is a class that wraps the response content from a request to the API
returned by `Cache.put` or `Cache.peek`, converting ResourceKeys into
ReactiveResource instances.

It is not directly instantiated by the user, and its properties should not
be directly modified. Whether individual properties are mutable or not is
determined by the record instance itself.

## Type Parameters

### T

`T`

### M

`M` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`

### E

`E` *extends* `object` = `object`

### EM

`EM` *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `M`
