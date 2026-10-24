---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/identifier/types/ResourceKey.md
description: >-
  Stable object with a unique `lid` plus `type` and `id` that uniquely
  references one resource's data in the cache, loaded or not.
---

# &#x20;ResourceKey\<T *extends* `string` = `string`>

```ts
type ResourceKey<T extends string = string> = 
  | PersistedResourceKey<T>
| NewResourceKey<T>;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:162](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/identifier.ts#L162)

A referentially stable object with a unique string (lid) that can be used
as a reference to data in the cache.

Every resource has a unique ResourceKey, and ResourceKeys may refer
to data that has never been loaded (for instance, in an async relationship).

The [Key Terminology](/guides/the-manual/caching/key-terms#resources) guide explains
the resources it identifies.

## Type Parameters

### T

`T` *extends* `string` = `string`
