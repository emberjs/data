---
url: >-
  https://canary.warp-drive.io/api/@warp-drive/core/types/cache/relationship/types/ResourceRelationship.md
description: >-
  Cache-side state of a to-one relationship, with `data` as a `ResourceKey` or
  `null` plus optional meta and links.
---

# &#x20;ResourceRelationship\<T = [`ResourceKey`](../../../identifier/types/ResourceKey.md)>

```ts
interface ResourceRelationship<T = ResourceKey> {
  data?: T | null;
  links?: Links;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:31](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/cache/relationship.ts#L31)

The stable-cache-key form of a `to-one` [relationship](../../../spec/json-api-raw/types/SingleResourceRelationship.md).

Unlike [SingleResourceRelationship](../../../spec/json-api-raw/types/SingleResourceRelationship.md), `data` is always in the
stable [ResourceKey](../../../identifier/types/ResourceKey.md) form rather than a raw resource identifier.

## Example

```ts
const relationship: ResourceRelationship = { data: resourceKey };
```

## Type Parameters

### T

`T` = [`ResourceKey`](../../../identifier/types/ResourceKey.md)

## Properties

### data?

```ts
data?: T | null;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:35](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/cache/relationship.ts#L35)

the related resource, or `null` if the relationship has no related resource

***

### links?

```ts
links?: Links;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:43](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/cache/relationship.ts#L43)

links related to the relationship

***

### meta?

```ts
meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:39](https://github.com/warp-drive-data/warp-drive/blob/a8ac10f9b2f8e2280b44fed40dedf5fb872cd5f4/warp-drive-packages/core/src/types/cache/relationship.ts#L39)

meta information about the relationship
