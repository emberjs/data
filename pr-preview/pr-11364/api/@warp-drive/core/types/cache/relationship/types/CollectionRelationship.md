---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/cache/relationship/types/CollectionRelationship.md
description: >-
  Cache-side state of a to-many relationship, with `data` as an array of
  `ResourceKey`s plus optional meta and pagination links.
---

# &#x20;CollectionRelationship\<T = [`ResourceKey`](../../../identifier/types/ResourceKey.md)>

```ts
interface CollectionRelationship<T = ResourceKey> {
  data?: T[];
  links?: PaginationLinks;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:60](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/relationship.ts#L60)

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

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:64](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/relationship.ts#L64)

the related resources

***

### links?

```ts
optional links?: PaginationLinks;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:72](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/relationship.ts#L72)

links related to the relationship, including pagination links

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:68](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/relationship.ts#L68)

meta information about the relationship
