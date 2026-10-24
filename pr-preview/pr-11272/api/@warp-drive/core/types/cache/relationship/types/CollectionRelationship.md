---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/cache/relationship/types/CollectionRelationship.md
---

# &#x20;CollectionRelationship\<T = [`ResourceKey`](../../../identifier/types/ResourceKey.md)>

```ts
interface CollectionRelationship<T = ResourceKey> {
  data?: T[];
  links?: PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:50](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/relationship.ts#L50)

The stable-cache-key form of a `to-many` [relationship](../../../spec/json-api-raw/types/CollectionResourceRelationship.md).

Unlike [CollectionResourceRelationship](../../../spec/json-api-raw/types/CollectionResourceRelationship.md), each entry in `data` is
always in the stable [ResourceKey](../../../identifier/types/ResourceKey.md) form rather than a raw resource
identifier.

## Example

```ts
const relationship: CollectionRelationship = { data: [resourceKey] };
```

## Type Parameters

### T

`T` = [`ResourceKey`](../../../identifier/types/ResourceKey.md)

## Properties

### data?

```ts
optional data?: T[];
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:54](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/relationship.ts#L54)

the related resources

***

### links?

```ts
optional links?: PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:62](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/relationship.ts#L62)

links related to the relationship, including pagination links

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:58](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/relationship.ts#L58)

meta information about the relationship
