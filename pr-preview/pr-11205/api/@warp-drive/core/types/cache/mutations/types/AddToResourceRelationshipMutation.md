---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/cache/mutations/types/AddToResourceRelationshipMutation.md
---

# &#x20;AddToResourceRelationshipMutation

```ts
interface AddToResourceRelationshipMutation {
  field: string;
  index?: number;
  op: "add";
  record: ResourceKey;
  value: 
  | ResourceKey
  | ResourceKey[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:11](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L11)

Adds the specified [ResourceKeys](../../../identifier/types/ResourceKey.md) to a relationship's
local (uncommitted) state.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:23](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L23)

The name of the relationship to add to

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:31](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L31)

The index at which to insert the resource(s), if applicable

***

### op

```ts
op: "add";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:15](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L15)

The name of the mutation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:19](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L19)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | ResourceKey
  | ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:27](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L27)

The resource(s) to add to the relationship
