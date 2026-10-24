---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/spec/document/types/ResourceDataDocument.md
description: >-
  Either a single-resource or a collection raw {json:api} data document, as
  stored in and returned by the cache.
---

# &#x20;ResourceDataDocument\<T = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)>

```ts
type ResourceDataDocument<T = PersistedResourceKey> = 
  | SingleResourceDataDocument<T>
| CollectionResourceDataDocument<T>;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:112](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/spec/document.ts#L112)

A type useful for representing the raw {json:api} documents that
the cache may use.

See also:

* [SingleResourceDataDocument](SingleResourceDataDocument.md)
* [CollectionResourceDataDocument](CollectionResourceDataDocument.md)

For the Reactive value returned by a request using the store, use [ReactiveDataDocument](../../../../reactive/types/ReactiveDataDocument.md) instead.

## Type Parameters

### T

`T` = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)
