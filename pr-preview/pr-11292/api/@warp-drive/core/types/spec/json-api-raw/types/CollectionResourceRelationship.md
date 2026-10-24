---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/spec/json-api-raw/types/CollectionResourceRelationship.md
---

# &#x20;CollectionResourceRelationship\<T = `ExistingResourceIdentifierObject` | `NewResourceIdentifierObject`>

```ts
interface CollectionResourceRelationship<T = ExistingResourceIdentifierObject | NewResourceIdentifierObject> {
  data?: T[];
  links?: PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:231](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L231)

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

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:235](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L235)

the related resources

***

### links?

```ts
optional links?: PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:243](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L243)

links related to the relationship, including pagination links

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/spec/json-api-raw.ts:239](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/spec/json-api-raw.ts#L239)

meta information about the relationship
