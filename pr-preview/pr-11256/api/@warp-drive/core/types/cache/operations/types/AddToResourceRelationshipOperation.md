---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/core/types/cache/operations/types/AddToResourceRelationshipOperation.md
description: >-
  Cache operation passed to `cache.patch` that adds resources to a
  relationship's remote state, optionally at an index.
---

# &#x20;AddToResourceRelationshipOperation

```ts
interface AddToResourceRelationshipOperation extends Op {
  field: string;
  index?: number;
  op: "add";
  record: PersistedResourceKey;
  value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:204](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/operations.ts#L204)

Adds the specified ResourceKeys to a relationship

## Extends

* [`Op`](Op.md)

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:213](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/operations.ts#L213)

The name of the relationship to add to

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:221](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/operations.ts#L221)

The index at which to insert the resource(s), if applicable

***

### op

```ts
op: "add";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:205](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/operations.ts#L205)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:209](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/operations.ts#L209)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:217](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/core/src/types/cache/operations.ts#L217)

The resource(s) to add to the relationship
