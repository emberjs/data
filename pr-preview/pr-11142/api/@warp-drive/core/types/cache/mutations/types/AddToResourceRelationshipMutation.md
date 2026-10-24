---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/core/types/cache/mutations/types/AddToResourceRelationshipMutation.md
description: >-
  Cache mutation passed to `cache.mutate` that adds one or more resources to a
  relationship's local state, optionally at an index.
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

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:20](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/cache/mutations.ts#L20)

Adds the specified [ResourceKeys](../../../identifier/types/ResourceKey.md) to a relationship's
local (uncommitted) state.

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:32](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/cache/mutations.ts#L32)

The name of the relationship to add to

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:40](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/cache/mutations.ts#L40)

The index at which to insert the resource(s), if applicable

***

### op

```ts
op: "add";
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:24](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/cache/mutations.ts#L24)

The name of the mutation

***

### record

```ts
record: ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:28](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/cache/mutations.ts#L28)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | ResourceKey
  | ResourceKey[];
```

Defined in: [warp-drive-packages/core/src/types/cache/mutations.ts:36](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/core/src/types/cache/mutations.ts#L36)

The resource(s) to add to the relationship
