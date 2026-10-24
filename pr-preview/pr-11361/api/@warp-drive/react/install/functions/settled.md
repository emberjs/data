---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/react/install/functions/settled.md
description: >-
  Resolves once all requests tracked by the React signal integration have
  settled, for use in tests; a no-op unless `TESTING` is enabled.
---

# &#x20;settled()

```ts
function settled(): Promise<void>;
```

Defined in: [install.ts:57](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/react/src/install.ts#L57)

Resolves once all pending requests started via WarpDrive's React signal
integration have settled. Only tracks requests while `TESTING` is enabled;
a no-op otherwise.

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
