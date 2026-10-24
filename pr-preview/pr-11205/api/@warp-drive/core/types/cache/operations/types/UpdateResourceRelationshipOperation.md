---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/cache/operations/types/UpdateResourceRelationshipOperation.md
---

# &#x20;UpdateResourceRelationshipOperation

```ts
interface UpdateResourceRelationshipOperation extends Op {
  field: string;
  op: "update";
  record: PersistedResourceKey;
  value: Relationship<PersistedResourceKey<string>>;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:133](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L133)

Replaces the state of a relationship with a new state

## Extends

* [`Op`](Op.md)

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:142](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L142)

The name of the relationship to update

***

### op

```ts
op: "update";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:134](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L134)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:138](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L138)

The cache key for the resource

***

### value

```ts
value: Relationship<PersistedResourceKey<string>>;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:146](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/operations.ts#L146)

The new state for the relationship
