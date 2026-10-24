---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/spec/json-api-raw/types/Links.md
description: >-
  The `links` member of a {json:api} resource, relationship, or document, with
  optional `self` and `related` links.
---

# &#x20;Links

```ts
interface Links {
  related?: Link | null;
  self?: Link | null;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:64](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L64)

The `links` member of a {json:api} resource or document.

[{json:api} Spec](https://jsonapi.org/format/#document-links)

## Extended by

* [`PaginationLinks`](PaginationLinks.md)

## Properties

### related?

```ts
optional related?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:68](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L68)

a link for retrieving the related resource(s)

***

### self?

```ts
optional self?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:72](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L72)

a link for retrieving the resource or document itself
