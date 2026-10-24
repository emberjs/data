---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/core/types/cache/operations/types/RemoveFromResourceRelationshipOperation.md
description: >-
  Cache operation passed to `cache.patch` that removes resources from a
  relationship's remote state.
---

# &#x20;RemoveFromResourceRelationshipOperation

```ts
interface RemoveFromResourceRelationshipOperation extends Op {
  field: string;
  index?: number;
  op: "remove";
  record: PersistedResourceKey;
  value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:228](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L228)

Removes the specified ResourceKeys from a relationship

## Extends

* [`Op`](Op.md)

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:237](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L237)

The name of the relationship to remove from

***

### index?

```ts
optional index?: number;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:245](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L245)

The index to remove the resource(s) from, if applicable

***

### op

```ts
op: "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:229](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L229)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:233](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L233)

The cache key for the resource whose relationship is being updated

***

### value

```ts
value: 
  | PersistedResourceKey<string>
  | PersistedResourceKey<string>[];
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:241](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/core/src/types/cache/operations.ts#L241)

The resource(s) to remove from the relationship
