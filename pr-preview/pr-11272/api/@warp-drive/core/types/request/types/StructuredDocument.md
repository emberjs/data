---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/request/types/StructuredDocument.md
---

# &#x20;StructuredDocument\<T>

```ts
type StructuredDocument<T> = 
  | StructuredDataDocument<T>
| StructuredErrorDocument<T>;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:506](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/request.ts#L506)

A union of the resolve/reject data types for the [Future](../../../request/types/Future.md)
returned by [request](../../../classes/Store.md#request)

See also the docs for:

* [Future](../../../request/types/Future.md)
* [StructuredDataDocument](StructuredDataDocument.md) (resolved/successful requests)
* [StructuredErrorDocument](StructuredErrorDocument.md) (rejected/failed requests)

## Type Parameters

### T

`T`
