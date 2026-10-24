---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/spec/document/types/SingleResourceDataDocument.md
description: >-
  A raw {json:api} document whose `data` is a single resource or `null`, as
  returned by a request and inserted into the cache.
---

# &#x20;SingleResourceDataDocument\<T = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md), R = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)>

```ts
interface SingleResourceDataDocument<T = PersistedResourceKey, R = PersistedResourceKey> {
  data: T | null;
  included?: R[];
  lid?: string;
  links?: 
  | Links
  | PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:44](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/document.ts#L44)

This type represents a raw {json:api} document for a single resource
returned by a request intended to be inserted into the cache.

For the Reactive value returned by a request using the store, use [ReactiveDataDocument](../../../../reactive/types/ReactiveDataDocument.md) instead.

## Type Parameters

### T

`T` = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)

### R

`R` = [`PersistedResourceKey`](../../../identifier/types/PersistedResourceKey.md)

## Properties

### data

```ts
data: T | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:60](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/document.ts#L60)

the resource the document represents, or `null` if it has none

***

### included?

```ts
optional included?: R[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:64](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/document.ts#L64)

any additional resources included via sideloading

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:48](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/document.ts#L48)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:52](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/document.ts#L52)

links related to the document

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:56](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/spec/document.ts#L56)

meta information about the document
