---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/spec/document/types/CollectionResourceDataDocument.md
---

# &#x20;CollectionResourceDataDocument\<T = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)>

```ts
interface CollectionResourceDataDocument<T = PersistedResourceKey> {
  data: T[];
  included?: T[];
  lid?: string;
  links?: 
  | Links
  | PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:61](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L61)

This type represents a raw {json:api} document for a resource collection
returned by a request intended to be inserted into the cache.

For the Reactive value returned by a request using the store, use [ReactiveDataDocument](../../../../reactive/types/ReactiveDataDocument.md) instead.

## Type Parameters

### T

`T` = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)

## Properties

### data

```ts
data: T[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:77](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L77)

the resources the document represents

***

### included?

```ts
optional included?: T[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:81](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L81)

any additional resources included via sideloading

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:65](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L65)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:69](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L69)

links related to the document, including pagination links

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:73](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/spec/document.ts#L73)

meta information about the document
