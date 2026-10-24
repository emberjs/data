---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/core/types/spec/json-api-raw/types/LinkObject.md
description: >-
  The object form of a {json:api} link: an `href` URI-reference plus optional
  `meta`.
---

# &#x20;LinkObject

```ts
type LinkObject = {
  href: string;
  meta?: Meta;
};
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:29](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L29)

The object form of a [Link](Link.md), allowing a link to carry
additional [meta](Meta.md) information alongside its `href`.

[{json:api} Spec](https://jsonapi.org/format/#document-links)

## Properties

### href

```ts
href: string;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:33](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L33)

the URI-reference for the link

***

### meta?

```ts
optional meta?: Meta;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:37](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L37)

meta information about the link
