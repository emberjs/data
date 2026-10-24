---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/spec/document/types/SingleResourceDataDocument.md
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

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:32](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/document.ts#L32)

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

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:48](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/document.ts#L48)

the resource the document represents, or `null` if it has none

***

### included?

```ts
optional included?: R[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:52](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/document.ts#L52)

any additional resources included via sideloading

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:36](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/document.ts#L36)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:40](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/document.ts#L40)

links related to the document

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:44](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/spec/document.ts#L44)

meta information about the document
