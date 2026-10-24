---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/types/spec/document/types/ResourceMetaDocument.md
description: >-
  A raw {json:api} document carrying only `meta` and optional `links`, as
  returned by a request and inserted into the cache.
---

# &#x20;ResourceMetaDocument

```ts
interface ResourceMetaDocument {
  lid?: string;
  links?: 
  | Links
  | PaginationLinks;
  meta: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:20](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/document.ts#L20)

This type represents a raw {json:api} document for a meta-only
document returned by a request intended to be inserted into the cache.

## Properties

### lid?

```ts
optional lid?: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:24](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/document.ts#L24)

the url or cache-key associated with the structured document

***

### links?

```ts
optional links?: 
  | Links
  | PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:32](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/document.ts#L32)

links related to the document

***

### meta

```ts
meta: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/document.ts:28](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/document.ts#L28)

meta information about the document
