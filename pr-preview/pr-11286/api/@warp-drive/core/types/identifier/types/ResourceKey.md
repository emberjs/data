---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/identifier/types/ResourceKey.md
---

# &#x20;ResourceKey\<T *extends* `string` = `string`>

```ts
type ResourceKey<T extends string = string> = 
  | PersistedResourceKey<T>
| NewResourceKey<T>;
```

Defined in: [warp-drive-packages/core/src/types/identifier.ts:134](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/identifier.ts#L134)

A referentially stable object with a unique string (lid) that can be used
as a reference to data in the cache.

Every resource has a unique ResourceKey, and ResourceKeys may refer
to data that has never been loaded (for instance, in an async relationship).

## Type Parameters

### T

`T` *extends* `string` = `string`
