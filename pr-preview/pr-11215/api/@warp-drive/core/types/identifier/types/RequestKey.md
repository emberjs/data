---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/types/identifier/types/RequestKey.md
description: >-
  Stable object with a unique `lid` that references a cached request document,
  letting that request's result be retrieved or replayed.
---

# &#x20;RequestKey

```ts
interface RequestKey {
  lid: string;
  type: "@document";
}
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:56](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/identifier.ts#L56)

A referentially stable object with a unique string (lid) that can be used
as a reference to request data in the cache.

Only requests that are assigned a RequestKey are retrievable/replayable from
the cache, though requests without RequestKeys may still update cache state.

The [Key Terminology](/guides/the-manual/caching/key-terms#documents) guide explains
the documents it identifies.

## Properties

### lid

```ts
lid: string;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:60](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/identifier.ts#L60)

A string representing a unique identity.

***

### type

```ts
type: "@document";
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:64](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/core/src/types/identifier.ts#L64)

Discriminates a RequestKey from a [ResourceKey](ResourceKey.md).
