---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/core/types/spec/document/types/ResourceDocument.md
description: >-
  Any raw {json:api} document the cache stores and returns: meta-only,
  single-resource, collection, or error.
---

# &#x20;ResourceDocument\<T = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)>

```ts
type ResourceDocument<T = PersistedResourceKey> = 
  | ResourceMetaDocument
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>
  | ResourceErrorDocument;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:159](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/core/src/types/spec/document.ts#L159)

A type useful for representing the raw {json:api} documents that
the cache may use.

See also:

* [ResourceMetaDocument](ResourceMetaDocument.md)
* [SingleResourceDataDocument](SingleResourceDataDocument.md)
* [CollectionResourceDataDocument](CollectionResourceDataDocument.md)
* [ResourceErrorDocument](ResourceErrorDocument.md)

For the Reactive value returned by a request using the store, use [ReactiveDocument](../../../../reactive/types/ReactiveDocument.md) instead.

## Type Parameters

### T

`T` = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)
