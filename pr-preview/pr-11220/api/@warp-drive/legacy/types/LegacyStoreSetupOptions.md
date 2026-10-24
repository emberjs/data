---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/legacy/types/LegacyStoreSetupOptions.md
description: >-
  Options accepted by `useLegacyStore`, choosing via `linksMode` and
  `legacyRequests` how much of the legacy `Model`, adapter, and request support
  to enable.
---

&#x20;

# &#x20;LegacyStoreSetupOptions\<T *extends* `Cache` = `Cache`>

```ts
type LegacyStoreSetupOptions<T extends Cache = Cache> = 
  | LegacyModelStoreSetupOptions<T>
  | LegacyModelAndNetworkStoreSetupOptions<T>
| LegacyModelAndNetworkAndRequestStoreSetupOptions<T>;
```

Defined in: [warp-drive-packages/legacy/src/index.ts:165](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/index.ts#L165)

The available options when setting up the legacy store,
one of:

* [LegacyModelStoreSetupOptions](LegacyModelStoreSetupOptions.md)
* [LegacyModelAndNetworkStoreSetupOptions](LegacyModelAndNetworkStoreSetupOptions.md)
* [LegacyModelAndNetworkAndRequestStoreSetupOptions](LegacyModelAndNetworkAndRequestStoreSetupOptions.md)

## Type Parameters

### T

`T` *extends* `Cache` = `Cache`
