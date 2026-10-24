---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/functions/setKeyInfoForResource.md
description: >-
  Overrides how the store derives the `type` and `id` of a new `ResourceKey`
  from resource data; must be set before the store is created.
---

# &#x20;setKeyInfoForResource()

```ts
function setKeyInfoForResource(method: KeyInfoMethod | null): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts:364](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts#L364)

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
