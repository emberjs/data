---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11217/api/@warp-drive/core/types/cache/aliases/types/ResourceBlob.md
description: >-
  Opaque raw resource data whose format the Cache defines and from which the
  CacheKeyManager can derive a `ResourceKey`.
---

# &#x20;ResourceBlob

```ts
type ResourceBlob = unknown;
```

Defined in: [warp-drive-packages/core/src/types/cache/aliases.ts:28](https://github.com/warp-drive-data/warp-drive/blob/e75fe00c15999baf9e36ef9be92910cb9906dc62/warp-drive-packages/core/src/types/cache/aliases.ts#L28)

The `ResourceBlob` is an opaque type that must satisfy two constraints.

1. it should be possible for the CacheKeyManager to be able to
   generate a [ResourceKey](../../../identifier/types/ResourceKey.md) for it, whether by default or due to
   configuration.
2. it should be in a format expected by the [Cache](../../types/Cache.md). This format
   is [Cache](../../types/Cache.md)-declared.

This opaqueness allows arbitrary storage of any serializable/transferable
state, including such things as `Buffer`s and `String`s.
