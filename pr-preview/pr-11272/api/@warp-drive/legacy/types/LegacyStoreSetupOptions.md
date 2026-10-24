---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/types/LegacyStoreSetupOptions.md
---

&#x20;

# &#x20;LegacyStoreSetupOptions\<T *extends* `Cache` = `Cache`>

```ts
type LegacyStoreSetupOptions<T extends Cache = Cache> = 
  | LegacyModelStoreSetupOptions<T>
  | LegacyModelAndNetworkStoreSetupOptions<T>
| LegacyModelAndNetworkAndRequestStoreSetupOptions<T>;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:154](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/index.ts#L154)

The available options when setting up the legacy store,
one of:

* [LegacyModelStoreSetupOptions](LegacyModelStoreSetupOptions.md)
* [LegacyModelAndNetworkStoreSetupOptions](LegacyModelAndNetworkStoreSetupOptions.md)
* [LegacyModelAndNetworkAndRequestStoreSetupOptions](LegacyModelAndNetworkAndRequestStoreSetupOptions.md)

## Type Parameters

### T

`T` *extends* `Cache` = `Cache`
