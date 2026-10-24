---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/spec/json-api-raw/types/PaginationLinks.md
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

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:64](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L64)

The `links` member of a {json:api} document that supports pagination.

[{json:api} Spec](https://jsonapi.org/format/#fetching-pagination)

## Extends

* [`Links`](Links.md)

## Properties

### first?

```ts
optional first?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:68](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L68)

a link to the first page of data

***

### last?

```ts
optional last?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:72](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L72)

a link to the last page of data

***

### next?

```ts
optional next?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:80](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L80)

a link to the next page of data

***

### prev?

```ts
optional prev?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:76](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L76)

a link to the previous page of data

***

### related?

```ts
optional related?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:52](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L52)

a link for retrieving the related resource(s)

#### Inherited from

[`Links`](Links.md).[`related`](Links.md#related)

***

### self?

```ts
optional self?: Link | null;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:56](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L56)

a link for retrieving the resource or document itself

#### Inherited from

[`Links`](Links.md).[`self`](Links.md#self)
