---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/api/@warp-drive/react/install/functions/settled.md
description: >-
  Resolves once all requests tracked by the React signal integration have
  settled, for use in tests; a no-op unless `TESTING` is enabled.
---

# &#x20;settled()

```ts
function settled(): Promise<void>;
```

Defined in: [install.ts:57](https://github.com/warp-drive-data/warp-drive/blob/15523fa92cca7933dbc4693ecbacd2e8508eb72e/warp-drive-packages/react/src/install.ts#L57)

Resolves once all pending requests started via WarpDrive's React signal
integration have settled. Only tracks requests while `TESTING` is enabled;
a no-op otherwise.

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`void`>
