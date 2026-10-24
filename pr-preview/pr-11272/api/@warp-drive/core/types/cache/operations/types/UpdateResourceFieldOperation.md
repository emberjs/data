---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/cache/operations/types/UpdateResourceFieldOperation.md
---

# &#x20;UpdateResourceFieldOperation

```ts
interface UpdateResourceFieldOperation extends Op {
  field: string;
  op: "update";
  record: PersistedResourceKey;
  value: Value;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:115](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/operations.ts#L115)

Replaces the state of a field with a new state

## Extends

* [`Op`](Op.md)

## Properties

### field

```ts
field: string;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:124](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/operations.ts#L124)

The name of the field to update

***

### op

```ts
op: "update";
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:116](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/operations.ts#L116)

The name of the [operation](Op.md)

#### Overrides

[`Op`](Op.md).[`op`](Op.md#op)

***

### record

```ts
record: PersistedResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:120](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/operations.ts#L120)

The cache key for the resource

***

### value

```ts
value: Value;
```

Defined in: [warp-drive-packages/core/src/types/cache/operations.ts:128](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/cache/operations.ts#L128)

The new value for the field
