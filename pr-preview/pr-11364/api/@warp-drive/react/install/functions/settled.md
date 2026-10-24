---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11364/api/@warp-drive/react/install/functions/settled.md
description: >-
  Resolves once all requests tracked by the React signal integration have
  settled, for use in tests; a no-op unless `TESTING` is enabled.
---

# &#x20;settled()

```ts
function settled(): Promise<void>;
```

Defined in: [install.ts:57](https://github.com/warp-drive-data/warp-drive/blob/aa8c40f25a3a1b12e361ab01c9a1a96b8a21b86e/warp-drive-packages/react/src/install.ts#L57)

Resolves once all pending requests started via WarpDrive's React signal
integration have settled. Only tracks requests while `TESTING` is enabled;
a no-op otherwise.

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
