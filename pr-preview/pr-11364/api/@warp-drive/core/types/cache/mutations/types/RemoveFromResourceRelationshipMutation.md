---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/types/cache/mutations/types/RemoveFromResourceRelationshipMutation.md
description: >-
  Cache mutation passed to `cache.mutate` that removes one or more resources
  from a relationship's local state.
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

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:50](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/mutations.ts#L50)

Removes the specified [ResourceKeys](../../../identifier/types/ResourceKey.md) from a relationship's
local (uncommitted) state.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:62](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/mutations.ts#L62)

The name of the relationship to remove from

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:70](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/mutations.ts#L70)

The index to remove the resource(s) from, if applicable

***

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:54](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/mutations.ts#L54)

The name of the mutation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:58](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/mutations.ts#L58)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | ResourceKey
  | ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:66](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/types/cache/mutations.ts#L66)

The resource(s) to remove from the relationship
