---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/types/cache/change/types/Change.md
description: >-
  One upsert or removal of a resource or document recorded by the cache, with an
  optional patch, as returned by `cache.diff`.
---

# &#x20;Change

```ts
interface Change {
  identifier: 
  | RequestKey
  | ResourceKey;
  op: "upsert" | "remove";
  patch?: unknown;
}
```

Defined in: [warp-drive-packages/core/src/types/cache/change.ts:25](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/change.ts#L25)

Describes a single mutation to a resource or document that occurred
in the cache, as returned by [Cache.diff](../../types/Cache.md#diff).

## Example

```ts
const change: Change = {
  identifier: resourceKey,
  op: 'upsert',
  patch: { name: 'Chris' },
};
```

## Properties

### identifier

```ts
identifier: 
  | RequestKey
  | ResourceKey;
```

Defined in: [warp-drive-packages/core/src/types/cache/change.ts:29](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/change.ts#L29)

the [ResourceKey](../../../identifier/types/ResourceKey.md) or [RequestKey](../../../identifier/types/RequestKey.md) of the entity that changed

***

### op

```ts
op: "upsert" | "remove";
```

Defined in: [warp-drive-packages/core/src/types/cache/change.ts:34](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/change.ts#L34)

the type of change that occurred. If `'upsert'`, [patch](#patch)
will be present with the data to merge into the cache for the entity.

***

### patch?

```ts
optional patch?: unknown;
```

Defined in: [warp-drive-packages/core/src/types/cache/change.ts:46](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/types/cache/change.ts#L46)

When [op](#op) is `'upsert'`, the data to merge into the
cache for the entity.

This is opaque to the Store but should be understood by the Cache and
may be utilized by an Adapter when generating data during a `save`
operation.

It is generally recommended that `patch` contain only the updated
state, ignoring fields that are unchanged.
