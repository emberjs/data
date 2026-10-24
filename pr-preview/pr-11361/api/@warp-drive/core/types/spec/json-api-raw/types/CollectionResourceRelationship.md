---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/core/types/spec/json-api-raw/types/CollectionResourceRelationship.md
description: >-
  A to-many {json:api} relationship object whose `data` is an array of resource
  identifiers, with optional `meta` and pagination `links`.
---

# &#x20;CollectionResourceRelationship\<T = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`>

```ts
interface CollectionResourceRelationship<T = ExistingResourceIdentifierObject | NewResourceIdentifierObject> {
  data?: T[];
  links?: PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:260](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L260)

Represents a `to-many` {json:api} relationship.

[{json:api} Spec](https://jsonapi.org/format/#document-resource-object-relationships)

## Example

```json
{
  "data": [{ "type": "comment", "id": "1" }, { "type": "comment", "id": "2" }]
}
```

## Type Parameters

### T

`T` = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`

## Properties

### data?

```ts
optional data?: T[];
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:264](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L264)

the related resources

***

### links?

```ts
optional links?: PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:272](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L272)

links related to the relationship, including pagination links

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:268](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L268)

meta information about the relationship
