---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/cache/relationship/types/Relationship.md
description: >-
  Cache-side state of a to-one or to-many relationship, with related resources
  as `ResourceKey`s, as returned by `cache.getRelationship`.
---

# &#x20;Relationship\<T = [`ResourceKey`](../../../identifier/types/ResourceKey.md)>

```ts
type Relationship<T = ResourceKey> = 
  | ResourceRelationship<T>
| CollectionRelationship<T>;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:85](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/relationship.ts#L85)

The stable-cache-key form of a relationship, whether `to-one` or `to-many`.

See also:

* [ResourceRelationship](ResourceRelationship.md)
* [CollectionRelationship](CollectionRelationship.md)

## Type Parameters

### T

`T` = [`ResourceKey`](../../../identifier/types/ResourceKey.md)
