---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/types/cache/aliases/types/ResourceBlob.md
---

# &#x20;ResourceBlob

```ts
type ResourceBlob = unknown;
```

Defined in: [warp-drive-packages/core/src/types/cache/aliases.ts:20](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/types/cache/aliases.ts#L20)

The `ResourceBlob` is an opaque type that must satisfy two constraints.

1. it should be possible for the CacheKeyManager to be able to
   generate a [ResourceKey](../../../identifier/types/ResourceKey.md) for it, whether by default or due to
   configuration.
2. it should be in a format expected by the [Cache](../../types/Cache.md). This format
   is [Cache](../../types/Cache.md)-declared.

This opaqueness allows arbitrary storage of any serializable/transferable
state, including such things as `Buffer`s and `String`s.
