---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/spec/document/types/ResourceErrorDocument.md
---

# &#x20;ResourceErrorDocument

```ts
interface ResourceErrorDocument {
  errors: ApiError[];
  lid?: string;
  links?: 
  | Links
  | PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:104](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/document.ts#L104)

A type useful for representing the raw {json:api} Error documents that
the cache may use.

For the Reactive value returned by a request using the store, use [ReactiveErrorDocument](../../../../reactive/types/ReactiveErrorDocument.md) instead.

## Properties

### errors

```ts
errors: ApiError[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:120](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/document.ts#L120)

the errors the document represents

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:108](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/document.ts#L108)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:112](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/document.ts#L112)

links related to the document

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:116](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/document.ts#L116)

meta information about the document
