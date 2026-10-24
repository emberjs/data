---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/functions/setKeyInfoForResource.md
---

# &#x20;setKeyInfoForResource()

```ts
function setKeyInfoForResource(method: KeyInfoMethod | null): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts:354](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts#L354)

Configure a callback for when the identifier cache is generating a new
ResourceKey for a resource.

This method controls the `type` and `id` that will be assigned to the
`ResourceKey` that is created.

This configuration MUST occur prior to the store instance being created.

```js
import { setKeyInfoForResource } from '@warp-drive/core';
```

## Parameters

### method

`KeyInfoMethod` | `null`

## Returns

`void`
