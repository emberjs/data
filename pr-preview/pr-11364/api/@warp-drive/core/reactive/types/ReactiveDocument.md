---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/reactive/types/ReactiveDocument.md
description: >-
  The reactive wrapper around a request's response document that exposes its
  data or errors as live records, plus meta, links, and pagination helpers.
---

# &#x20;ReactiveDocument\<T, M *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined`, E *extends* `object` = `object`, EM *extends* [`Meta`](../../types/spec/json-api-raw/types/Meta.md) | `undefined` = `M`>

```ts
type ReactiveDocument<T, M extends Meta | undefined = Meta | undefined, E extends object = object, EM extends Meta | undefined = M> = 
  | ReactiveDataDocument<T, M, E, EM>
| ReactiveErrorDocument<T, EM, E, M>;
```

Defined in: [warp-drive-packages/core/src/reactive/-private/document.ts:267](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/reactive/-private/document.ts#L267)

A Document is a class that wraps the response content from a request to the API
returned by `Cache.put` or `Cache.peek`, converting ResourceKeys into
ReactiveResource instances.

The [Using The Response](/guides/the-manual/requests/using-the-response) guide
shows when a request's content is a ReactiveDocument.

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
