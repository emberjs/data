---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/spec/json-api-raw/types/Link.md
---

# &#x20;Link

```ts
type Link = string | LinkObject;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:41](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L41)

A link is either a plain URI-reference string or a [LinkObject](LinkObject.md)
carrying additional meta information.

[{json:api} Spec](https://jsonapi.org/format/#document-links)

## Example

```ts
const simple: Link = '/articles/1/comments';
const withMeta: Link = { href: '/articles/1/comments', meta: { count: 10 } };
```
