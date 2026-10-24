---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/cache/mutations/types/RemoveFromResourceRelationshipMutation.md
---

# &#x20;RemoveFromResourceRelationshipMutation

```ts
interface RemoveFromResourceRelationshipMutation {
  field: string;
  index?: number;
  op: "remove";
  record: ResourceKey;
  value: 
  | ResourceKey
  | ResourceKey[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:38](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L38)

Removes the specified [ResourceKeys](../../../identifier/types/ResourceKey.md) from a relationship's
local (uncommitted) state.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:50](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L50)

The name of the relationship to remove from

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:58](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L58)

The index to remove the resource(s) from, if applicable

***

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:42](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L42)

The name of the mutation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:46](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L46)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | ResourceKey
  | ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:54](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/mutations.ts#L54)

The resource(s) to remove from the relationship
