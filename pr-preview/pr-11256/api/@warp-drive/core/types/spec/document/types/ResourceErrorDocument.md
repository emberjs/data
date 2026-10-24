---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/spec/document/types/ResourceErrorDocument.md
description: >-
  A raw {json:api} document carrying an `errors` array for a failed request, as
  stored in and returned by the cache.
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

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:125](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/spec/document.ts#L125)

A type useful for representing the raw {json:api} Error documents that
the cache may use.

For the Reactive value returned by a request using the store, use [ReactiveErrorDocument](../../../../reactive/types/ReactiveErrorDocument.md) instead.

## Properties

### errors

```ts
errors: ApiError[];
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:141](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/spec/document.ts#L141)

the errors the document represents

***

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:129](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/spec/document.ts#L129)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:133](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/spec/document.ts#L133)

links related to the document

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:137](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/spec/document.ts#L137)

meta information about the document
