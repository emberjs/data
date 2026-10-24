---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/core/functions/setIdentifierResetMethod.md
description: >-
  Registers a callback run when the store's key cache is torn down, for
  resetting any custom key-generation state.
---

# &#x20;setIdentifierResetMethod()

```ts
function setIdentifierResetMethod(method: ResetMethod | null): void;
```

Defined in: [warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts:343](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/core/src/store/-private/managers/cache-key-manager.ts#L343)

Configure a callback for when the identifier cache is being torn down.

This configuration MUST occur prior to the store instance being created.

```js
import { setIdentifierResetMethod } from '@warp-drive/core';
```

Takes a method which can expect to be called when the parent application is destroyed.

If you have properly used a WeakMap to encapsulate the state of your customization
to the application instance, you may not need to implement the `resetMethod`.

## Parameters

### method

`ResetMethod` | `null`

## Returns

`void`
