---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/cache/relationship/types/ResourceRelationship.md
---

# &#x20;ResourceRelationship\<T = [`ResourceKey`](../../../identifier/types/ResourceKey.md)>

```ts
interface ResourceRelationship<T = ResourceKey> {
  data?: T | null;
  links?: Links;
  meta?: ObjectValue;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:23](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/relationship.ts#L23)

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
optional data?: T | null;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:27](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/relationship.ts#L27)

the related resource, or `null` if the relationship has no related resource

***

### links?

```ts
optional links?: Links;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:35](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/relationship.ts#L35)

links related to the relationship

***

### meta?

```ts
optional meta?: ObjectValue;
```

Defined in: [warp-drive-packages/core/src/types/cache/relationship.ts:31](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/cache/relationship.ts#L31)

meta information about the relationship
