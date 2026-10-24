---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/spec/document/types/ResourceDocument.md
---

# &#x20;ResourceDocument\<T = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)>

```ts
type ResourceDocument<T = PersistedResourceKey> = 
  | ResourceMetaDocument
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>
  | ResourceErrorDocument;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:135](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L135)

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
