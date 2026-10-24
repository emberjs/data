---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/spec/document/types/CollectionResourceDataDocument.md
description: >-
  A raw {json:api} document whose `data` is an array of resources, as returned
  by a request and inserted into the cache.
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

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:76](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/spec/document.ts#L76)

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

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:92](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/spec/document.ts#L92)

the resources the document represents

***

### included?

```ts
optional included?: T[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:96](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/spec/document.ts#L96)

any additional resources included via sideloading

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:80](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/spec/document.ts#L80)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:84](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/spec/document.ts#L84)

links related to the document, including pagination links

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:88](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/spec/document.ts#L88)

meta information about the document
