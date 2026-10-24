---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/types/spec/json-api-raw/types/PaginationLinks.md
description: >-
  A {json:api} `links` member that adds `first`, `last`, `prev`, and `next`
  pagination links to `self` and `related`.
---

# &#x20;PaginationLinks

```ts
interface PaginationLinks extends Links {
  first?: Link | null;
  last?: Link | null;
  next?: Link | null;
  prev?: Link | null;
  related?: Link | null;
  self?: Link | null;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:83](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L83)

The `links` member of a {json:api} document that supports pagination.

[{json:api} Spec](https://jsonapi.org/format/#fetching-pagination)

## Extends

* [`Links`](Links.md)

## Properties

### first?

```ts
optional first?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:87](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L87)

a link to the first page of data

***

### last?

```ts
optional last?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:91](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L91)

a link to the last page of data

***

### next?

```ts
optional next?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:99](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L99)

a link to the next page of data

***

### prev?

```ts
optional prev?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:95](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L95)

a link to the previous page of data

***

### related?

```ts
optional related?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:68](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L68)

a link for retrieving the related resource(s)

#### Inherited from

[`Links`](Links.md).[`related`](Links.md#related)

***

### self?

```ts
optional self?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:72](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L72)

a link for retrieving the resource or document itself

#### Inherited from

[`Links`](Links.md).[`self`](Links.md#self)
