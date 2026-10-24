---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/core/functions/setIdentifierForgetMethod.md
description: >-
  Registers a callback run when the store releases a resource key, for cleaning
  up your own lookup tables.
---

# &#x20;setIdentifierForgetMethod()

```ts
function setIdentifierForgetMethod(method: ForgetMethod | null): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts:321](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts#L321)

Configure a callback for when the identifier cache is going to release an identifier.

This configuration MUST occur prior to the store instance being created.

```js
import { setIdentifierForgetMethod } from '@warp-drive/core';
```

Takes method which can expect to receive an existing `Identifier` that should be eliminated
from any secondary lookup tables or caches that the user has populated for it.

## Parameters

### method

`ForgetMethod` | `null`

## Returns

`void`
